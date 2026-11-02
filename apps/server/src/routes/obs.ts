/**
 * OBS WebSocket REST surface. All commands proxy to the server-side adapter
 * (services/obs.ts); the OBS password is never returned to clients.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  connect,
  disconnect,
  getStatus,
  listScenes,
  switchScene,
  listSources,
  setSourceVisibility,
  ObsNotConnectedError,
} from '../services/obs.js';

function fail(req: FastifyRequest, reply: FastifyReply, err: unknown) {
  const status = (err as { statusCode?: number })?.statusCode ?? 500;
  const message = err instanceof Error ? err.message : 'OBS command failed';
  req.log.warn({ err }, 'OBS command failed');
  reply.code(status).send({ error: 'OBSError', message });
}

export async function getObsStatus(_req: FastifyRequest, reply: FastifyReply) {
  reply.send({ status: getStatus() });
}

export async function connectObs(req: FastifyRequest, reply: FastifyReply) {
  // Connect uses the server-side config; an optional body can override host/port
  // for this process only (the password is never accepted from the client).
  const body = (req.body ?? {}) as { host?: string; port?: number };
  const status = await connect({ host: body.host || undefined, port: body.port || undefined });
  reply.send({ status });
}

export async function disconnectObs(_req: FastifyRequest, reply: FastifyReply) {
  reply.send({ status: await disconnect() });
}

export async function getScenes(req: FastifyRequest, reply: FastifyReply) {
  try {
    reply.send({ scenes: await listScenes() });
  } catch (err) {
    if (err instanceof ObsNotConnectedError) return fail(req, reply, err);
    fail(req, reply, err);
  }
}

const switchSceneSchema = z.object({ sceneName: z.string().min(1) });
export async function postSwitchScene(req: FastifyRequest, reply: FastifyReply) {
  const parsed = switchSceneSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues });
  }
  try {
    reply.send({ status: await switchScene(parsed.data.sceneName) });
  } catch (err) {
    fail(req, reply, err);
  }
}

export async function getSources(req: FastifyRequest, reply: FastifyReply) {
  const { sceneName } = req.query as { sceneName?: string };
  try {
    reply.send({ sources: await listSources(sceneName) });
  } catch (err) {
    fail(req, reply, err);
  }
}

const visibilitySchema = z.object({
  sceneName: z.string().min(1),
  sourceName: z.string().min(1),
  visible: z.boolean(),
});
export async function postSourceVisibility(req: FastifyRequest, reply: FastifyReply) {
  const parsed = visibilitySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues });
  }
  try {
    const { sceneName, sourceName, visible } = parsed.data;
    reply.send({ status: await setSourceVisibility(sceneName, sourceName, visible) });
  } catch (err) {
    fail(req, reply, err);
  }
}
