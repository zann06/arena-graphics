import type { FastifyRequest, FastifyReply } from 'fastify';
import { getDBClient } from '../db/client.js';
import { getStatus as getObsStatus } from '../services/obs.js';

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected' | 'unknown';
    realtime: 'ready';
    obs: 'connected' | 'disconnected' | 'error';
    capabilities: string[];
    phase: number;
  };
}

export function setupHealth() {
  return async (_req: FastifyRequest, res: FastifyReply) => {
    let database: 'connected' | 'disconnected' | 'unknown';

    try {
      const client = getDBClient();
      await client.execute('SELECT 1');
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    const obs = getObsStatus();

    return res.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database,
        realtime: 'ready',
        obs: obs.connected ? 'connected' : obs.state === 'error' ? 'error' : 'disconnected',
        capabilities: ['tournaments', 'teams', 'players', 'matches', 'game-results', 'mlbb', 'obs', 'templates', 'assets'],
        phase: 6,
      },
    } satisfies HealthResponse);
  };
}
