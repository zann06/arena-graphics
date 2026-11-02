/**
 * Phase 7 verification: overlay output is exactly 1920×1080 and the background
 * is transparent (alpha≈0 at the corners) so OBS composites the graphic over
 * gameplay instead of showing a solid box.
 *
 * Usage: node scripts/verify-overlay-transparency.mjs [matchId]
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { io } from 'socket.io-client';
import { captureWhenReady } from './cdp-shot.mjs';

const baseUrl = 'http://127.0.0.1:4000';
const matchId = Number(process.argv[2] || 1);
const artifacts = resolve('artifacts');

const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p));

/** Minimal PNG decoder: returns width, height, colorType, and per-pixel RGBA getter. */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported color type ${colorType}`);

  // Inflate IDAT.
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  const bpp = channels;
  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    // Un-filter.
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let val = line[x];
      if (filter === 1) val = (val + a) & 255;
      else if (filter === 2) val = (val + b) & 255;
      else if (filter === 3) val = (val + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (val + pr) & 255;
      }
      line[x] = val;
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      if (channels === 4) {
        out[o] = line[x * 4];
        out[o + 1] = line[x * 4 + 1];
        out[o + 2] = line[x * 4 + 2];
        out[o + 3] = line[x * 4 + 3];
      } else if (channels === 3) {
        out[o] = line[x * 3];
        out[o + 1] = line[x * 3 + 1];
        out[o + 2] = line[x * 3 + 2];
        out[o + 3] = 255;
      } else if (channels === 2) {
        out[o] = out[o + 1] = out[o + 2] = line[x * 2];
        out[o + 3] = line[x * 2 + 1];
      } else {
        out[o] = out[o + 1] = out[o + 2] = line[x];
        out[o + 3] = 255;
      }
    }
    prev = line;
  }
  return {
    width,
    height,
    colorType,
    alpha: (x, y) => out[(y * width + x) * 4 + 3],
  };
}

// Put an overlay on air so the capture is not empty.
const socket = io(baseUrl, { transports: ['websocket'], reconnection: true });
await new Promise((r, j) => {
  socket.on('connect', r);
  socket.on('connect_error', j);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
socket.emit('match:select', { matchId });
for (let i = 0; i < 60; i += 1) await wait(100);
socket.emit('graphic:set', { key: 'scoreboard', visible: true });
await wait(800);

const out = resolve(artifacts, 'overlay-transparency-check.png');
await captureWhenReady(edge, `${baseUrl}/overlay/scoreboard`, out, 'body .overlay-graphic.is-visible', {
  width: 1920,
  height: 1080,
  timeoutMs: 25000,
  transparent: true,
});

const png = decodePng(readFileSync(out));

// Sample the four corners and a few edge points.
const points = [
  [2, 2],
  [png.width - 3, 2],
  [2, png.height - 3],
  [png.width - 3, png.height - 3],
];
const alphas = points.map(([x, y]) => png.alpha(x, y));

const dimsOk = png.width === 1920 && png.height === 1080;
const hasAlphaChannel = png.colorType === 4 || png.colorType === 6;
const cornersTransparent = alphas.every((a) => a <= 16);

console.log(`Capture: ${out} (${statSync(out).size} bytes)`);
console.log(`Size: ${png.width}×${png.height} (colorType ${png.colorType})`);
console.log(`Corner alphas: ${alphas.join(', ')}`);
console.log(`\n${dimsOk ? 'PASS' : 'FAIL'} output is exactly 1920×1080`);
console.log(`${hasAlphaChannel ? 'PASS' : 'FAIL'} PNG has an alpha channel`);
console.log(`${cornersTransparent ? 'PASS' : 'FAIL'} corners are transparent (alpha≈0)`);

socket.disconnect();
process.exit(dimsOk && hasAlphaChannel && cornersTransparent ? 0 : 1);
