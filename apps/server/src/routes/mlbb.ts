import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  DRAFT_FORMATS,
  loadDraft,
  loadMvp,
  loadScoreboard,
  loadStatistics,
  resetDraftSlots,
  saveDraftSlot,
  saveMvp,
  saveStatistics,
  type DraftFormatKey,
} from '../services/mlbb.js';
import { getLiveState, selectMatch } from '../realtime/state.js';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const gameParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  gameNumber: z.coerce.number().int().min(1).max(5),
});

const draftBodySchema = z.object({
  side: z.enum(['blue', 'red']),
  actionType: z.enum(['ban', 'pick']),
  slotNumber: z.number().int().min(1).max(5),
  heroId: z.number().int().positive().nullable(),
});

const statisticsBodySchema = z.object({
  blue: z.object({
    kills: z.number().int().min(0).max(9999),
    turrets: z.number().int().min(0).max(99),
    turtles: z.number().int().min(0).max(99),
    lords: z.number().int().min(0).max(99),
    gold: z.number().int().min(-10_000_000).max(10_000_000),
  }),
  red: z.object({
    kills: z.number().int().min(0).max(9999),
    turrets: z.number().int().min(0).max(99),
    turtles: z.number().int().min(0).max(99),
    lords: z.number().int().min(0).max(99),
    gold: z.number().int().min(-10_000_000).max(10_000_000),
  }),
  durationSeconds: z.number().int().min(0).max(86_400).nullable().default(null),
});

const mvpBodySchema = z.object({
  playerId: z.number().int().positive(),
  heroId: z.number().int().positive().nullable(),
  kills: z.number().int().min(0).max(99),
  deaths: z.number().int().min(0).max(99),
  assists: z.number().int().min(0).max(99),
});

function currentGameFor(matchId: number): number {
  const state = getLiveState();
  if (state.payload.selectedMatchId === String(matchId) && state.payload.currentGame) {
    return state.payload.currentGame;
  }
  return 1;
}

async function syncLiveState(matchId: number): Promise<void> {
  const state = getLiveState();
  if (state.payload.selectedMatchId === String(matchId)) {
    await selectMatch(matchId);
  }
}

export async function getMatchDraft(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) return res.code(400).send({ error: 'Invalid match ID' });

  const scoreboard = await loadScoreboard(parsed.data.id);
  if (!scoreboard) return res.code(404).send({ error: 'Match not found' });

  const gameNumber = currentGameFor(parsed.data.id);
  const format = (req.query as { format?: DraftFormatKey })?.format;
  const draft = await loadDraft(
    parsed.data.id,
    gameNumber,
    format && DRAFT_FORMATS[format] ? format : 'standard'
  );
  return res.code(200).send(draft);
}

export async function setMatchDraftSlot(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) return res.code(400).send({ error: 'Invalid match ID' });

  const body = draftBodySchema.safeParse(req.body);
  if (!body.success) return res.code(400).send({ error: 'Validation failed', details: body.error.issues });

  const scoreboard = await loadScoreboard(parsed.data.id);
  if (!scoreboard) return res.code(404).send({ error: 'Match not found' });

  const gameNumber = currentGameFor(parsed.data.id);
  try {
    await saveDraftSlot({ ...body.data, matchId: parsed.data.id, gameNumber });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 400;
    return res.code(status).send({ error: err instanceof Error ? err.message : 'Failed to save draft slot' });
  }
  await syncLiveState(parsed.data.id);

  const draft = await loadDraft(parsed.data.id, gameNumber, 'standard');
  return res.code(200).send(draft);
}

export async function resetMatchDraft(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) return res.code(400).send({ error: 'Invalid match ID' });

  const scoreboard = await loadScoreboard(parsed.data.id);
  if (!scoreboard) return res.code(404).send({ error: 'Match not found' });

  const gameNumber = currentGameFor(parsed.data.id);
  await resetDraftSlots(parsed.data.id, gameNumber);
  await syncLiveState(parsed.data.id);
  const draft = await loadDraft(parsed.data.id, gameNumber, 'standard');
  return res.code(200).send(draft);
}

export async function getGameStatistics(req: FastifyRequest<{ Params: { id: string; gameNumber: string } }>, res: FastifyReply) {
  const parsed = gameParamsSchema.safeParse(req.params);
  if (!parsed.success) return res.code(400).send({ error: 'Invalid match or game number' });

  const scoreboard = await loadScoreboard(parsed.data.id);
  if (!scoreboard) return res.code(404).send({ error: 'Match not found' });

  const statistics = await loadStatistics(parsed.data.id, parsed.data.gameNumber);
  return res.code(200).send(statistics);
}

export async function setGameStatistics(req: FastifyRequest<{ Params: { id: string; gameNumber: string } }>, res: FastifyReply) {
  const parsed = gameParamsSchema.safeParse(req.params);
  if (!parsed.success) return res.code(400).send({ error: 'Invalid match or game number' });

  const body = statisticsBodySchema.safeParse(req.body);
  if (!body.success) return res.code(400).send({ error: 'Validation failed', details: body.error.issues });

  const scoreboard = await loadScoreboard(parsed.data.id);
  if (!scoreboard) return res.code(404).send({ error: 'Match not found' });

  const statistics = await saveStatistics({
    matchId: parsed.data.id,
    gameNumber: parsed.data.gameNumber,
    ...body.data,
  });
  await syncLiveState(parsed.data.id);
  return res.code(200).send(statistics);
}

export async function getMatchMvp(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) return res.code(400).send({ error: 'Invalid match ID' });

  const mvp = await loadMvp(parsed.data.id, currentGameFor(parsed.data.id));
  if (!mvp) return res.code(404).send({ error: 'No MVP recorded for this game' });
  return res.code(200).send(mvp);
}

export async function setMatchMvp(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) return res.code(400).send({ error: 'Invalid match ID' });

  const body = mvpBodySchema.safeParse(req.body);
  if (!body.success) return res.code(400).send({ error: 'Validation failed', details: body.error.issues });

  const scoreboard = await loadScoreboard(parsed.data.id);
  if (!scoreboard) return res.code(404).send({ error: 'Match not found' });

  try {
    const mvp = await saveMvp({
      matchId: parsed.data.id,
      gameNumber: currentGameFor(parsed.data.id),
      ...body.data,
    });
    await syncLiveState(parsed.data.id);
    return res.code(200).send(mvp);
  } catch (err) {
    return res.code(404).send({ error: err instanceof Error ? err.message : 'Failed to save MVP' });
  }
}
