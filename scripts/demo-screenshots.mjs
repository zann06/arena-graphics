/**
 * Generates the README/demo screenshot set into docs/screenshots/.
 *
 * Seeds a realistic match fixture (RRQ vs ONIC, full draft, statistics, MVP),
 * puts every graphic on air, then captures:
 *   - each overlay at exact 1920×1080 (transparent PNG, composited here over a
 *     neutral dark backdrop so it is legible in the README)
 *   - each dashboard page at 1600×1000
 *
 * Requires the server on :4000 and a copy of Microsoft Edge (headless).
 *
 * Usage: node scripts/demo-screenshots.mjs [matchId]
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';
import { io } from 'socket.io-client';
import { captureWhenReady } from './cdp-shot.mjs';

const baseUrl = 'http://127.0.0.1:4000';
const matchId = Number(process.argv[2] || 1);
const outDir = resolve('docs', 'screenshots');
mkdirSync(outDir, { recursive: true });

const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p));
if (!edge) {
  console.error('Microsoft Edge not found — install Edge or set a path in this script.');
  process.exit(1);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ---------------------------------------------------------------------------
// 1. Seed a realistic fixture so every graphic has real data to render.
// ---------------------------------------------------------------------------
const HEROES = ['Ling', 'Tigreal', 'Valentina', 'Fredrinn', 'Beatrix', 'Fanny', 'Chou', 'Kagura', 'Claude', 'Yu Zhong', 'Nolan', 'Cici'];
await api('POST', '/api/heroes/import', { names: HEROES });
const heroes = (await api('GET', '/api/heroes')).body ?? [];
const heroId = (n) => heroes.find((h) => h.name.toLowerCase() === n.toLowerCase())?.id ?? null;

const bluePicks = ['Ling', 'Fredrinn', 'Valentina', 'Beatrix', 'Kagura'].map(heroId);
const redPicks = ['Fanny', 'Tigreal', 'Chou', 'Claude', 'Yu Zhong'].map(heroId);
const blueBans = ['Nolan', 'Cici', 'Fanny'].map(heroId);
const redBans = ['Ling', 'Fredrinn', 'Kagura'].map(heroId);

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
  await api('POST', `/api/matches/${matchId}/mvp`, { playerId: roster[0].id, heroId: heroId('Ling'), kills: 12, deaths: 1, assists: 8 });
}

// ---------------------------------------------------------------------------
// 2. Put every graphic on air over a live socket (so the overlays render).
// ---------------------------------------------------------------------------
const socket = io(baseUrl, { transports: ['websocket'], reconnection: true });
await new Promise((r, j) => {
  socket.on('connect', r);
  socket.on('connect_error', j);
});
let state = null;
socket.on('state:initial', (s) => (state = s));
socket.on('state:update', (s) => (state = s));
socket.emit('match:select', { matchId });
for (let i = 0; i < 60 && !(state?.payload?.selectedMatchId === matchId && state?.payload?.data?.mvp); i++) {
  await wait(150);
}
const ALL = ['scoreboard', 'playerIntro', 'teamIntro', 'draft', 'statistics', 'mvp', 'fullscreen'];
for (const key of ALL) socket.emit('graphic:set', { key, visible: true });
// Fire an objective banner that stays on air (durationMs 0) so it is captured.
socket.emit('objective:alert', { type: 'lord', side: 'blue', durationMs: 0 });
await wait(900);
console.log(`Fixture ready: ${state?.payload?.data?.scoreboard?.blue?.shortName} vs ${state?.payload?.data?.scoreboard?.red?.shortName}`);
void state;

// ---------------------------------------------------------------------------
// 3. Minimal PNG decode/encode so transparent overlay captures can be
//    composited over a neutral studio backdrop (still RGBA, README-friendly).
// ---------------------------------------------------------------------------
function decodePng(buf) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    offset += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      line[x] = v;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (channels === 4) {
        px[o] = line[x * 4];
        px[o + 1] = line[x * 4 + 1];
        px[o + 2] = line[x * 4 + 2];
        px[o + 3] = line[x * 4 + 3];
      } else if (channels === 3) {
        px[o] = line[x * 3];
        px[o + 1] = line[x * 3 + 1];
        px[o + 2] = line[x * 3 + 2];
        px[o + 3] = 255;
      } else if (channels === 2) {
        px[o] = px[o + 1] = px[o + 2] = line[x * 2];
        px[o + 3] = line[x * 2 + 1];
      } else {
        px[o] = px[o + 1] = px[o + 2] = line[x];
        px[o + 3] = 255;
      }
    }
    prev = line;
  }
  return { width, height, px };
}

function encodePng({ width, height, px }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    px.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const chunks = [];
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    chunks.push(len, body, crc);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  chunk('IHDR', ihdr);
  chunk('IDAT', deflateSync(raw));
  chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...chunks]);
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return c ^ -1;
}

/** Composite a transparent overlay over a dark vertical gradient backdrop. */
function overBackdrop({ width, height, px }, top = [10, 16, 32], bottom = [3, 6, 14]) {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = y / Math.max(1, height - 1);
    const bgR = Math.round(top[0] + (bottom[0] - top[0]) * t);
    const bgG = Math.round(top[1] + (bottom[1] - top[1]) * t);
    const bgB = Math.round(top[2] + (bottom[2] - top[2]) * t);
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const a = px[o + 3] / 255;
      out[o] = Math.round(px[o] * a + bgR * (1 - a));
      out[o + 1] = Math.round(px[o + 1] * a + bgG * (1 - a));
      out[o + 2] = Math.round(px[o + 2] * a + bgB * (1 - a));
      out[o + 3] = 255;
    }
  }
  return { width, height, px: out };
}

// ---------------------------------------------------------------------------
// 4. Capture every overlay at 1920×1080 (transparent) and composite it.
// ---------------------------------------------------------------------------
const overlays = [
  ['scoreboard', 'overlay-scoreboard'],
  ['player-intro', 'overlay-player-intro'],
  ['team-intro', 'overlay-team-intro'],
  ['draft', 'overlay-draft'],
  ['statistics', 'overlay-statistics'],
  ['mvp', 'overlay-mvp'],
  ['fullscreen', 'overlay-fullscreen'],
  ['objective', 'overlay-objective'],
];

let failures = 0;
for (const [kind, name] of overlays) {
  const tmp = resolve(outDir, `_${name}.tmp.png`);
  try {
    await captureWhenReady(edge, `${baseUrl}/overlay/${kind}?preview=1`, tmp, 'body .overlay-graphic.is-visible', {
      width: 1920,
      height: 1080,
      timeoutMs: 25000,
      transparent: true,
    });
    const composited = overBackdrop(decodePng(readFileSync(tmp)));
    const out = resolve(outDir, `${name}.png`);
    writeFileSync(out, encodePng(composited));
    rmSync(tmp, { force: true });
    const size = statSync(out).size;
    console.log(`${size > 20000 ? 'PASS' : 'FAIL'}  ${name} (${size} bytes)`);
    if (size <= 20000) failures += 1;
  } catch (err) {
    rmSync(tmp, { force: true });
    failures += 1;
    console.log(`FAIL  ${name} — ${err.message.split('\n')[0]}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Capture the dashboard pages at 1600×1000.
// ---------------------------------------------------------------------------
const pages = [
  ['/dashboard/control', 'ui-control', 'nav'],
  ['/dashboard/matches', 'ui-matches', 'nav'],
  ['/dashboard/templates', 'ui-templates', 'nav'],
  ['/dashboard/assets', 'ui-assets', 'nav'],
  ['/dashboard/heroes', 'ui-heroes', 'nav'],
  ['/dashboard/obs', 'ui-obs', 'nav'],
  ['/monitor', 'ui-monitor', 'js:!!document.querySelector("h1") && document.querySelector("h1").textContent.includes("Monitor")'],
];
for (const [path, name, ready] of pages) {
  const out = resolve(outDir, `${name}.png`);
  try {
    await captureWhenReady(edge, `${baseUrl}${path}`, out, ready, { width: 1600, height: 1000, timeoutMs: 25000 });
    const size = statSync(out).size;
    console.log(`${size > 15000 ? 'PASS' : 'FAIL'}  ${name} (${size} bytes)`);
    if (size <= 15000) failures += 1;
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} — ${err.message.split('\n')[0]}`);
  }
}

socket.disconnect();
console.log(`\n${failures === 0 ? `All screenshots written to ${outDir}` : `${failures} capture(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
