/**
 * Phase 3 graphics engine smoke test.
 *
 * Exercises every operator command over Socket.IO against a running server and
 * asserts the resulting authoritative state. Also covers reconnect
 * resynchronisation and invalid payload rejection.
 *
 * Usage: node scripts/graphics-smoke.mjs [baseUrl] [matchId]
 */
import { io } from 'socket.io-client';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4000';
const matchId = Number(process.argv[3] || 1);

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, { transports: ['websocket'], reconnection: false });
    const timer = setTimeout(() => reject(new Error('connect timeout')), 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', reject);
  });
}

function nextState(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('state timeout')), 5000);
    const done = (state) => {
      clearTimeout(timer);
      socket.off('state:initial', done);
      socket.off('state:update', done);
      resolve(state);
    };
    socket.once('state:initial', done);
    socket.once('state:update', done);
  });
}

async function emitAndWait(socket, event, payload) {
  const waited = nextState(socket);
  socket.emit(event, payload);
  return waited;
}

const socket = await connect();
console.log(`Connected to ${baseUrl}`);

// 1. Initial snapshot
let waited = nextState(socket);
socket.emit('state:request');
let state = await waited;
check('state:initial delivered', state?.payload != null, `revision ${state.revision}`);
check('initial snapshot lists 7 overlay keys', Object.keys(state.payload.overlay).length === 7);

// 2. Select match
state = await emitAndWait(socket, 'match:select', { matchId });
const sb = state.payload.data.scoreboard;
check('match:select loads scoreboard', sb && sb.matchId === matchId, sb ? `${sb.blue.shortName} vs ${sb.red.shortName}` : 'no data');
check('series score derived from games', typeof sb?.blueWins === 'number' && typeof sb?.redWins === 'number', `${sb?.blueWins}-${sb?.redWins}`);
check('draft has 20 slots (5 ban + 5 pick per side)', state.payload.data.draft?.slots.length === 20);
check('statistics initialised', state.payload.data.statistics != null);
check('statistics labelled operator entered', state.payload.data.statistics?.label === 'OPERATOR ENTERED');

// 3. Every graphic can be shown and hidden
const keys = ['scoreboard', 'playerIntro', 'teamIntro', 'draft', 'statistics', 'mvp', 'fullscreen'];
for (const key of keys) {
  state = await emitAndWait(socket, 'graphic:set', { key, visible: true });
  check(`graphic:set show ${key}`, state.payload.overlay[key].visible === true);
}
check('revision increases monotonically', state.revision >= 9, `revision ${state.revision}`);

state = await emitAndWait(socket, 'graphic:reset');
check('graphic:reset hides everything', keys.every((k) => state.payload.overlay[k].visible === false));

// 4. Player intro stepping
state = await emitAndWait(socket, 'graphic:set', { key: 'playerIntro', visible: true });
const intro = state.payload.data.playerIntro;
check('player intro has roster', (intro?.players.length ?? 0) > 0, `${intro?.players.length ?? 0} player(s)`);
if ((intro?.players.length ?? 0) > 1) {
  state = await emitAndWait(socket, 'player-intro:step', { index: 1 });
  check('player-intro:step advances index', state.payload.data.playerIntro.index === 1, state.payload.data.playerIntro.player?.nickname);
  state = await emitAndWait(socket, 'player-intro:step', { index: 99 });
  check('player-intro:step clamps overflow', state.payload.data.playerIntro.index === intro.players.length - 1);
  state = await emitAndWait(socket, 'player-intro:step', { index: 0 });
} else {
  console.log('SKIP  player-intro:step advance (roster has 1 player)');
}

// 5. Team intro side switch
state = await emitAndWait(socket, 'team-intro:load', { side: 'red' });
check('team-intro:load red swaps roster', state.payload.data.teamIntro?.team.id === sb.red.id, state.payload.data.teamIntro?.team.shortName);
state = await emitAndWait(socket, 'team-intro:load', { side: 'blue' });
check('team-intro:load blue swaps back', state.payload.data.teamIntro?.team.id === sb.blue.id, state.payload.data.teamIntro?.team.shortName);

// 6. Statistics
const stats = {
  blue: { kills: 12, turrets: 5, turtles: 2, lords: 1, gold: 3200 },
  red: { kills: 9, turrets: 3, turtles: 1, lords: 0, gold: 2100 },
  durationSeconds: 1250,
};
state = await emitAndWait(socket, 'statistics:set', stats);
check('statistics:set stores values', state.payload.data.statistics.blue.kills === 12 && state.payload.data.statistics.red.kills === 9);

// 7. MVP
// The mvp:set contract is { playerId, heroId, kills, deaths, assists }.
const heroes = await fetch(`${baseUrl}/api/heroes`).then((r) => r.json()).catch(() => []);
const mvpHeroId = heroes[0]?.id ?? null;
const mvp = {
  playerId: intro?.players[0]?.id ?? null,
  heroId: mvpHeroId,
  kills: 10,
  deaths: 2,
  assists: 8,
};
state = await emitAndWait(socket, 'mvp:set', mvp);
check('mvp:set stores KDA', state.payload.data.mvp.kills === 10 && state.payload.data.mvp.assists === 8);

// 8. Fullscreen
state = await emitAndWait(socket, 'fullscreen:set', { mode: 'break', title: 'BREAK TIME', subtitle: 'Back in 3 minutes' });
check('fullscreen:set stores card', state.payload.data.fullscreen.title === 'BREAK TIME');

// 9. Invalid payloads are rejected
const errors = [];
const onError = (e) => errors.push(e.message);
const onceError = () =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 1200);
    socket.once('system:error', (e) => {
      clearTimeout(timer);
      resolve(e.message);
    });
  });
let rejected = onceError();
socket.emit('graphic:set', { key: 'not-a-graphic', visible: true });
const invalidKeyMessage = await rejected;
check('invalid graphic key rejected', invalidKeyMessage?.includes('key'), invalidKeyMessage);
rejected = onceError();
socket.emit('statistics:set', { blue: { kills: -5 }, red: {} });
check('invalid statistics rejected', (await rejected) != null);
rejected = onceError();
socket.emit('graphic:set', null);
check('null payload rejected', (await rejected) != null);
socket.off('system:error', onError);

// 10. Reconnect resynchronisation
socket.disconnect();
const socket2 = await connect();
const waited2 = nextState(socket2);
socket2.emit('state:request');
const recovered = await waited2;
check('reconnect restores full snapshot', recovered.payload.data.scoreboard?.matchId === matchId);
check('reconnect restores MVP', recovered.payload.data.mvp.kills === 10);
check('reconnect restores statistics', recovered.payload.data.statistics.red.turrets === 3);
check('reconnect restores revision', recovered.revision >= state.revision, `${recovered.revision} >= ${state.revision}`);

socket2.disconnect();
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
