import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
// apps/server/dist/index.js -> apps/server, so web/dist sits next to it.
const __dirname = dirname(dirname(__filename));

import dotenv from 'dotenv';
import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import staticPlugin from '@fastify/static';
import corsPlugin from '@fastify/cors';
import multipartPlugin from '@fastify/multipart';
import { setupHealth } from './routes/health.js';
import { setupSocket } from './socket/index.js';
import { validateEnv } from './config/env.js';
import { initDB } from './db/client.js';
import { migrate } from './db/migrate.js';

// Import route handlers
import {
  createTournament,
  listTournaments,
  getTournament,
  updateTournament,
  deleteTournament,
} from './routes/tournaments.js';

import {
  createTeam,
  listTeams,
  getTeam,
  getTeamRoster,
  updateTeam,
  deleteTeam,
} from './routes/teams.js';

import {
  createPlayer,
  listPlayers,
  getPlayer,
  getPlayersByTeam,
  updatePlayer,
  deletePlayer,
} from './routes/players.js';

import {
  createMatch,
  listMatches,
  getMatch,
  getMatchesByTournament,
  updateMatch,
  deleteMatch,
  recordGameResult,
  getMatchGames,
} from './routes/matches.js';

import { createHero, listHeroes, deleteHero, updateHero, importHeroes } from './routes/heroes.js';
import {
  getObsStatus,
  connectObs,
  disconnectObs,
  getScenes,
  postSwitchScene,
  getSources,
  postSourceVisibility,
} from './routes/obs.js';
import { configureObs, connect as connectObsAdapter } from './services/obs.js';
import { listAssets, uploadAsset, deleteAsset } from './routes/assets.js';
import {
  listTemplatesHandler,
  getTemplateHandler,
  createTemplateHandler,
  updateTemplateHandler,
  activateTemplateHandler,
  duplicateTemplateHandler,
  resetTemplateHandler,
  deleteTemplateHandler,
} from './routes/templates.js';
import { assetsRoot, ensureAssetsRoot } from './services/assets.js';
import { seedDefaultTemplates } from './services/templates.js';
import { reloadThemes } from './realtime/state.js';
import {
  getMatchDraft,
  setMatchDraftSlot,
  resetMatchDraft,
  getGameStatistics,
  setGameStatistics,
  getMatchMvp,
  setMatchMvp,
} from './routes/mlbb.js';

dotenv.config();

const config = validateEnv();

const app = fastify({
  logger: {
    level: config.logLevel,
  },
});

// Health check route
app.get('/api/health', setupHealth());

// CORS for the Vite dev server and local overlay windows
await app.register(corsPlugin, {
  origin: [config.webOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: false,
});

// Multipart uploads for the asset library (size enforced in the handler).
await app.register(multipartPlugin, {
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

// Tournament routes
app.post('/api/tournaments', createTournament);
app.get('/api/tournaments', listTournaments);
app.get('/api/tournaments/:id', getTournament);
app.put('/api/tournaments/:id', updateTournament);
app.delete('/api/tournaments/:id', deleteTournament);

// Team routes
app.post('/api/teams', createTeam);
app.get('/api/teams', listTeams);
app.get('/api/teams/:id', getTeam);
app.get('/api/teams/:id/roster', getTeamRoster);
app.put('/api/teams/:id', updateTeam);
app.delete('/api/teams/:id', deleteTeam);

// Player routes
app.post('/api/players', createPlayer);
app.get('/api/players', listPlayers);
app.get('/api/players/:id', getPlayer);
app.get('/api/players/team/:teamId', getPlayersByTeam);
app.put('/api/players/:id', updatePlayer);
app.delete('/api/players/:id', deletePlayer);

// Match routes
app.post('/api/matches', createMatch);
app.get('/api/matches', listMatches);
app.get('/api/matches/:id', getMatch);
app.get('/api/matches/tournament/:tournamentId', getMatchesByTournament);
app.put('/api/matches/:id', updateMatch);
app.delete('/api/matches/:id', deleteMatch);
app.post('/api/matches/:id/games', recordGameResult);
app.get('/api/matches/:id/games', getMatchGames);

// Hero routes
app.get('/api/heroes', listHeroes);
app.post('/api/heroes', createHero);
app.post('/api/heroes/import', importHeroes);
app.put('/api/heroes/:id', updateHero);
app.delete('/api/heroes/:id', deleteHero);

// MLBB gameplay routes (draft, statistics, MVP)
app.get('/api/matches/:id/draft', getMatchDraft);
app.put('/api/matches/:id/draft', setMatchDraftSlot);
app.delete('/api/matches/:id/draft', resetMatchDraft);
app.get('/api/matches/:id/games/:gameNumber/statistics', getGameStatistics);
app.put('/api/matches/:id/games/:gameNumber/statistics', setGameStatistics);
app.get('/api/matches/:id/mvp', getMatchMvp);
app.post('/api/matches/:id/mvp', setMatchMvp);

// OBS WebSocket integration (server-side password, never exposed to clients)
app.get('/api/obs/status', getObsStatus);
app.post('/api/obs/connect', connectObs);
app.post('/api/obs/disconnect', disconnectObs);
app.get('/api/obs/scenes', getScenes);
app.post('/api/obs/scene', postSwitchScene);
app.get('/api/obs/sources', getSources);
app.post('/api/obs/source-visibility', postSourceVisibility);

// Asset library (upload / list / delete)
app.get('/api/assets', listAssets);
app.post('/api/assets/upload', uploadAsset);
app.delete('/api/assets/:id', deleteAsset);

// Template Studio. Mutations that change what is on air reload the live theme
// map and re-broadcast so overlays update immediately.
const afterThemeChange = <T extends (...args: any[]) => unknown>(handler: T): T =>
  (async (req: FastifyRequest, res: FastifyReply) => {
    const result = await (handler as any)(req, res);
    if (res.statusCode < 400) await reloadThemes().catch(() => undefined);
    return result;
  }) as T;

app.get('/api/templates', listTemplatesHandler);
app.get('/api/templates/:id', getTemplateHandler);
app.post('/api/templates', afterThemeChange(createTemplateHandler));
app.put('/api/templates/:id', afterThemeChange(updateTemplateHandler));
app.post('/api/templates/:id/activate', afterThemeChange(activateTemplateHandler));
app.post('/api/templates/:id/duplicate', duplicateTemplateHandler);
app.post('/api/templates/:id/reset', afterThemeChange(resetTemplateHandler));
app.delete('/api/templates/:id', afterThemeChange(deleteTemplateHandler));

// Uploaded assets are served read-only from the data directory. Create the
// directory first so the static plugin never fails on a fresh install.
ensureAssetsRoot();
app.register(staticPlugin, {
  root: assetsRoot(),
  prefix: '/uploads/',
  decorateReply: false,
  cacheControl: true,
  maxAge: '7d',
  wildcard: true,
});

// Static serving (after API routes)
// `__dirname` is apps/server (both when running from src via tsx and from the
// bundled dist/index.js), so the SPA build lives in ../web/dist.
const distPath = resolve(__dirname, '../web/dist');
if (!existsSync(distPath)) {
  console.warn(`[Static] SPA build not found at ${distPath} — run: pnpm --filter @arena/web build`);
}
console.log(`[Static] Serving SPA from ${distPath}`);

// IMPORTANT: no `wildcard`/`index` here. `@fastify/static` preloads a file map
// when those options are used, so files created by a later `vite build` (new
// hashed asset names) return 404 until the server restarts. Serving the
// directory with `wildcard: true` + our own index handler reads from disk on
// every request, so a fresh build is picked up immediately.
app.register(staticPlugin, {
  root: distPath,
  prefix: '/',
  // Hashed assets are immutable; index.html must never be cached so clients
  // always discover the current bundle name.
  cacheControl: true,
  maxAge: '1y',
  wildcard: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.header('cache-control', 'no-store, must-revalidate');
    }
  },
});

// 404 handler for unmatched routes (SPA fallback for dashboard/overlay routes)
app.setNotFoundHandler((req, res) => {
  const isGet = req.method === 'GET';
  const isApi = req.url.startsWith('/api') || req.url.startsWith('/socket.io');
  // Never answer a missing asset with HTML: a bad build must fail loudly in the
  // browser console instead of silently loading index.html as a module.
  const isAsset = /\.(js|mjs|css|map|woff2?|ttf|png|jpe?g|svg|gif|webp|ico|json|txt)$/i.test(
    req.url.split('?')[0] ?? ''
  );

  if (isGet && !isApi && !isAsset) {
    return res.type('text/html').sendFile('index.html');
  }

  res.code(404).send({ error: 'Not Found', message: 'Route not found' });
});

// Error handler
app.setErrorHandler((err, _, res) => {
  app.log.error(err);
  res.code(500).send({
    error: 'Internal Server Error',
    message: err instanceof Error ? err.message : 'An unexpected error occurred',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await app.close();
  process.exit(0);
});

// Start server
export async function start() {
  try {
    // Initialize DB and migrate on startup
    initDB();
    await migrate();

    // Start server
    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`[Server] Listening on ${config.host}:${config.port}`);

    // Socket.IO (after server is listening)
    setupSocket(app.server);
    console.log(`[Socket.IO] Initialized`);

    // Template Studio: make sure every graphic type has a template, then load
    // the active themes into the live payload so overlays render themed from
    // the first connection.
    await seedDefaultTemplates();
    await reloadThemes();
    console.log(`[Templates] Active themes loaded`);

    // OBS connection config (password stays server-side). Auto-connect is
    // opt-in so a missing OBS instance never blocks startup.
    configureObs({ host: config.obsHost, port: config.obsPort, password: config.obsPassword });
    if (config.obsAutoConnect) {
      connectObsAdapter()
        .then((status) => {
          console.log(`[OBS] auto-connect: ${status.state}${status.lastError ? ` (${status.lastError})` : ''}`);
        })
        .catch((err) => console.warn('[OBS] auto-connect failed:', err));
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
