import { Server } from 'socket.io';
import { z } from 'zod';
import {
  getLiveState,
  setRealtimeServer,
  selectMatch,
  setGraphicVisible,
  resetGraphics,
  stepPlayerIntro,
  setDraftSlot,
  setDraftFormat,
  resetDraft,
  setStatistics,
  resetStatistics,
  setMvp,
  setFullscreen,
  loadTeamIntro,
} from '../realtime/state.js';
import { DRAFT_FORMATS, FULLSCREEN_MODES, GRAPHIC_KEYS } from '@arena/shared/types/realtime.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@arena/shared/types/realtime.js';

const idSchema = z.number().int().positive();
const sideSchema = z.enum(['blue', 'red']);
const actionSchema = z.enum(['ban', 'pick']);
const statLineSchema = z.object({
  kills: z.number().int().min(0).max(9999),
  turrets: z.number().int().min(0).max(99),
  turtles: z.number().int().min(0).max(99),
  lords: z.number().int().min(0).max(99),
  gold: z.number().int().min(-10_000_000).max(10_000_000),
});
const draftFormatValues = Object.keys(DRAFT_FORMATS) as [string, ...string[]];

const payloadSchemas = {
  matchSelect: z.object({ matchId: idSchema }),
  graphicSet: z.object({ key: z.enum(GRAPHIC_KEYS), visible: z.boolean() }),
  // The handler clamps out-of-range indexes to the roster bounds, so allow a
  // generous ceiling instead of rejecting large values.
  playerIntroStep: z.object({ index: z.number().int().min(0).max(10_000) }),
  teamIntroLoad: z.object({ side: sideSchema }),
  draftSet: z.object({
    side: sideSchema,
    actionType: actionSchema,
    slotNumber: z.number().int().min(1).max(5),
    heroId: idSchema.nullable(),
  }),
  draftFormat: z.object({ format: z.enum(draftFormatValues) }),
  statisticsSet: z.object({
    blue: statLineSchema,
    red: statLineSchema,
    durationSeconds: z.number().int().min(0).max(86_400).nullable().default(null),
    label: z.string().max(80).optional(),
  }),
  mvpSet: z.object({
    playerId: idSchema,
    heroId: idSchema.nullable(),
    kills: z.number().int().min(0).max(99),
    deaths: z.number().int().min(0).max(99),
    assists: z.number().int().min(0).max(99),
  }),
  fullscreenSet: z.object({
    mode: z.enum(FULLSCREEN_MODES),
    title: z.string().min(1).max(60),
    subtitle: z.string().max(120),
  }),
} as const;

type Emitter = { emit: (event: 'system:error', payload: { message: string }) => void };

function parsePayload(schema: z.ZodTypeAny, payload: unknown): { data?: unknown; message?: string } {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return { data: parsed.data };
  const detail = parsed.error.issues[0];
  return {
    message: `Invalid ${detail?.path.join('.') || 'payload'}: ${detail?.message ?? 'validation failed'}`,
  };
}

/**
 * Wrap a handler so validation errors, async failures, and unexpected throws
 * are reported to the operator instead of crashing the socket connection.
 */
function run(socket: Emitter, schema: z.ZodTypeAny, payload: unknown, action: (data: any) => unknown) {
  const { data, message } = parsePayload(schema, payload);
  if (message) {
    socket.emit('system:error', { message });
    return;
  }
  Promise.resolve()
    .then(() => action(data))
    .catch((err: unknown) => {
      socket.emit('system:error', {
        message: err instanceof Error ? err.message : 'Command failed',
      });
    });
}

export function setupSocket(httpServer: any) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  setRealtimeServer(io as unknown as Server);

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    /** Register a typed event with validation + error reporting. */
    const on = <K extends keyof ClientToServerEvents>(
      event: K,
      schema: z.ZodTypeAny,
      action: (data: any) => unknown
    ) => {
      socket.on(event, ((payload: unknown) => run(socket, schema, payload, action)) as never);
    };

    on('state:request', z.any(), () => {
      socket.emit('state:initial', getLiveState());
    });
    on('match:select', payloadSchemas.matchSelect, (data: { matchId: number }) => selectMatch(data.matchId));
    on('graphic:set', payloadSchemas.graphicSet, (data: { key: never; visible: boolean }) =>
      setGraphicVisible(data.key, data.visible)
    );
    on('graphic:reset', z.any(), () => resetGraphics());
    on('player-intro:step', payloadSchemas.playerIntroStep, (data: { index: number }) =>
      stepPlayerIntro(data.index)
    );
    on('team-intro:load', payloadSchemas.teamIntroLoad, (data: { side: 'blue' | 'red' }) =>
      loadTeamIntro(data.side)
    );
    on('draft:set', payloadSchemas.draftSet, (data) => setDraftSlot(data));
    on('draft:format', payloadSchemas.draftFormat, (data: { format: 'standard' | 'quick' }) =>
      setDraftFormat(data)
    );
    on('draft:reset', z.any(), () => resetDraft());
    on('statistics:set', payloadSchemas.statisticsSet, (data) => setStatistics(data));
    on('statistics:reset', z.any(), () => resetStatistics());
    on('mvp:set', payloadSchemas.mvpSet, (data) => setMvp(data));
    on('fullscreen:set', payloadSchemas.fullscreenSet, (data) => setFullscreen(data));

    socket.on('system:ping', () => {
      socket.emit('system:pong', 0);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected (${reason}): ${socket.id}`);
    });
  });

  return io;
}
