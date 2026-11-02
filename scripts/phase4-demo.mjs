/**
 * End-to-end Phase 4 demo: drives draft / statistics / MVP through the real
 * REST + Socket.IO surface, then screenshots Control and Monitor with real data.
 *
 * Usage: node scripts/phase4-demo.mjs [baseUrl] [matchId]
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { io } from 'socket.io-client';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4000';
const matchId = Number(process.argv[3] || 1);

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function connect() {
  return new Promise((resolveConn, reject) => {
    const socket = io(baseUrl, { transports: ['websocket'], reconnection: false });
    socket.on('connect', () => resolveConn(socket));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}

function waitState(socket, event, payload) {
  return new Promise((resolveState, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), 8000);
    const done = (state) => {
      clearTimeout(timer);
      socket.off('state:initial', done);
      socket.off('state:update', done);
      resolveState(state);
    };
    socket.once('state:initial', done);
    socket.once('state:update', done);
    if (event) socket.emit(event, payload);
  });
}

// --- Realistic fixture data via REST
const heroes = (await api('GET', '/api/heroes')).body ?? [];
const pick = (...names) => names.map((n) => heroes.find((h) => h.name.toLowerCase() === n.toLowerCase())?.id ?? null);
const [ling, tigreal, valentina, fredrinn, beatrix] = pick('Ling', 'Tigreal', 'Valentina', 'Fredrinn', 'Beatrix');
const extraNames = ['Fanny', 'Chou', 'Kagura', 'Claude', 'Yu Zhong'];
await api('POST', '/api/heroes/import', { names: extraNames });
const heroes2 = (await api('GET', '/api/heroes')).body ?? [];
const byName = (n) => heroes2.find((h) => h.name.toLowerCase() === n.toLowerCase())?.id ?? null;

const bluePicks = [ling, fredrinn, valentina, beatrix, byName('Kagura')];
const redPicks = [byName('Fanny'), tigreal, byName('Chou'), byName('Claude'), byName('Yu Zhong')];

await api('DELETE', `/api/matches/${matchId}/draft`);
for (let i = 0; i < 5; i++) {
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'blue', actionType: 'pick', slotNumber: i + 1, heroId: bluePicks[i] });
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'red', actionType: 'pick', slotNumber: i + 1, heroId: redPicks[i] });
}
for (let i = 0; i < 3; i++) {
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'blue', actionType: 'ban', slotNumber: i + 1, heroId: byName(extraNames[3 - i]) });
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'red', actionType: 'ban', slotNumber: i + 1, heroId: byName(extraNames[i]) });
}

await api('PUT', `/api/matches/${matchId}/games/1/statistics`, {
  blue: { kills: 18, turrets: 8, turtles: 3, lords: 2, gold: 7350 },
  red: { kills: 11, turrets: 3, turtles: 1, lords: 0, gold: -7350 },
  durationSeconds: 1142,
});

const teams = (await api('GET', '/api/teams')).body ?? [];
const roster = (await api('GET', `/api/teams/${teams[0]?.id}/roster`)).body ?? [];
if (roster[0]) {
  await api('POST', `/api/matches/${matchId}/mvp`, {
    playerId: roster[0].id,
    heroId: ling,
    kills: 12,
    deaths: 1,
    assists: 8,
  });
}

// --- Realtime: select match so overlays show the data, keep the socket alive
const socket = await connect();
const state = await waitState(socket, 'match:select', { matchId });
const sb = state.payload.data.scoreboard;
console.log(`Selected ${sb?.blue.shortName} vs ${sb?.red.shortName}`);
console.log(`Draft filled: ${state.payload.data.draft?.slots.filter((s) => s.heroId).length}/20`);
console.log(`Statistics blue kills: ${state.payload.data.statistics?.blue.kills}`);
console.log(`MVP: ${state.payload.data.mvp?.nickname} (${state.payload.data.mvp?.heroName})`);

// --- Screenshots with live data
const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p));

const shots = [
  { name: 'ui-control-live', path: '/dashboard/control', h: 2400, ready: "js:document.body.innerText.toUpperCase().includes('REALTIME CONNECTED') && document.body.innerText.includes('RRQ')" },
  { name: 'ui-monitor-live', path: '/monitor', h: 1000, ready: 'js:document.body.innerText.includes("RRQ")' },
];

const { captureWhenReady } = await import('./cdp-shot.mjs');
for (const shot of shots) {
  const out = resolve('artifacts', `${shot.name}.png`);
  await captureWhenReady(edge, `${baseUrl}${shot.path}`, out, shot.ready, {
    width: 1600,
    height: shot.h,
    timeoutMs: 25000,
  });
  const { statSync } = await import('node:fs');
  console.log(`shot ${shot.name}: ${statSync(out).size} bytes`);
}

console.log('\nPhase 4 UI screenshots done. For overlays run: node scripts/verify-overlays.mjs');

socket.disconnect();
console.log('PHASE 4 DEMO COMPLETE');
