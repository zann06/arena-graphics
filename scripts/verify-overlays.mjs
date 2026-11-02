/**
 * Phase 4 overlay verification: seeds a full match fixture, puts the graphics
 * on air over a live socket, and captures each overlay only after its graphic
 * has actually rendered in the DOM (see cdp-shot.mjs).
 *
 * Usage: node scripts/verify-overlays.mjs [matchId]
 */
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { io } from 'socket.io-client';
import { captureWhenReady } from './cdp-shot.mjs';

const baseUrl = 'http://127.0.0.1:4000';
const matchId = Number(process.argv[2] || 1);
const artifacts = resolve('artifacts');

const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p));

const NAMES = ['Ling', 'Tigreal', 'Valentina', 'Fredrinn', 'Beatrix', 'Fanny', 'Chou', 'Kagura', 'Claude', 'Yu Zhong', 'Nolan', 'Cici'];

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

await api('POST', '/api/heroes/import', { names: NAMES });
const heroes = (await api('GET', '/api/heroes')).body ?? [];
const id = (n) => heroes.find((h) => h.name.toLowerCase() === n.toLowerCase())?.id ?? null;

const bluePicks = ['Ling', 'Fredrinn', 'Valentina', 'Beatrix', 'Kagura'].map(id);
const redPicks = ['Fanny', 'Tigreal', 'Chou', 'Claude', 'Yu Zhong'].map(id);
const blueBans = ['Nolan', 'Cici', 'Fanny'].map(id);
const redBans = ['Ling', 'Fredrinn', 'Kagura'].map(id);

await api('DELETE', `/api/matches/${matchId}/draft`);
for (let i = 0; i < 5; i++) {
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'blue', actionType: 'pick', slotNumber: i + 1, heroId: bluePicks[i] });
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'red', actionType: 'pick', slotNumber: i + 1, heroId: redPicks[i] });
}
for (let i = 0; i < 3; i++) {
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'blue', actionType: 'ban', slotNumber: i + 1, heroId: blueBans[i] });
  await api('PUT', `/api/matches/${matchId}/draft`, { side: 'red', actionType: 'ban', slotNumber: i + 1, heroId: redBans[i] });
}
await api('PUT', `/api/matches/${matchId}/games/1/statistics`, {
  blue: { kills: 18, turrets: 8, turtles: 3, lords: 2, gold: 7350 },
  red: { kills: 11, turrets: 3, turtles: 1, lords: 0, gold: -7350 },
  durationSeconds: 1142,
});
const teams = (await api('GET', '/api/teams')).body ?? [];
const roster = (await api('GET', `/api/teams/${teams[0]?.id}/roster`)).body ?? [];
if (roster[0]) {
  await api('POST', `/api/matches/${matchId}/mvp`, { playerId: roster[0].id, heroId: id('Ling'), kills: 12, deaths: 1, assists: 8 });
}

const socket = io(baseUrl, { transports: ['websocket'], reconnection: true });
await new Promise((r, j) => {
  socket.on('connect', r);
  socket.on('connect_error', j);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let state = null;
socket.on('state:initial', (s) => (state = s));
socket.on('state:update', (s) => (state = s));

socket.emit('match:select', { matchId });
for (let i = 0; i < 50 && !(state?.payload?.selectedMatchId === matchId && state?.payload?.data?.mvp); i++) {
  await wait(150);
}

for (const key of ['draft', 'statistics', 'mvp']) socket.emit('graphic:set', { key, visible: true });
// Objective banner stays on air for the capture so the slide-in can settle.
socket.emit('objective:alert', { type: 'lord', side: 'blue', durationMs: 0 });
await wait(800);

console.log('Match:', state?.payload?.data?.scoreboard?.blue?.shortName, 'vs', state?.payload?.data?.scoreboard?.red?.shortName);
console.log('Draft picks:', state?.payload?.data?.draft?.slots?.filter((s) => s.heroId && s.actionType === 'pick').length);
console.log('Stats kills:', state?.payload?.data?.statistics?.blue?.kills, '-', state?.payload?.data?.statistics?.red?.kills);
console.log('MVP:', state?.payload?.data?.mvp?.nickname, state?.payload?.data?.mvp?.heroName);

const checks = [
  { name: 'overlay-draft-live', kind: 'draft' },
  { name: 'overlay-statistics-live', kind: 'statistics' },
  { name: 'overlay-mvp-live', kind: 'mvp' },
  { name: 'overlay-objective-live', kind: 'objective' },
];

let failed = 0;
for (const { name, kind } of checks) {
  const out = resolve(artifacts, `${name}.png`);
  try {
    await captureWhenReady(edge, `${baseUrl}/overlay/${kind}`, out, 'body .overlay-graphic.is-visible', {
      width: 1920,
      height: 1080,
      timeoutMs: 25000,
      transparent: true,
    });
    const size = statSync(out).size;
    console.log(`${size > 20000 ? 'PASS' : 'FAIL'}  ${name} (${size} bytes)`);
    if (size <= 20000) failed += 1;
  } catch (err) {
    failed += 1;
    console.log(`FAIL  ${name} — ${err.message.split('\n')[0]}`);
  }
}

socket.disconnect();
console.log(`\n${failed === 0 ? 'ALL OVERLAYS CAPTURED' : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
