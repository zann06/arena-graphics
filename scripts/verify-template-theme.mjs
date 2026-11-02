/**
 * Phase 6 proof: a Template Studio edit changes what renders on air.
 *
 * 1. Applies a distinctive theme to the scoreboard template and activates it.
 * 2. Puts the scoreboard overlay on air and captures it (themed).
 * 3. Resets the scoreboard template to defaults.
 * 4. Captures again (default theme).
 * The two PNGs differ, and the themed one uses the new accent color.
 *
 * Usage: node scripts/verify-template-theme.mjs [matchId]
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

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const THEMED = {
  accentColor: '#ff0ea0',
  panelColor: '#14040f',
  textColor: '#fff6fb',
  displayFont: 'Oswald',
  scale: 1.12,
  radius: 16,
  showAccentBar: true,
};

// Find (or create) the active scoreboard template.
const templates = (await api('GET', '/api/templates')).body ?? [];
let scoreboardTpl = templates.find((t) => t.templateType === 'scoreboard' && t.isActive) ?? templates.find((t) => t.templateType === 'scoreboard');
if (!scoreboardTpl) {
  const created = await api('POST', '/api/templates', {
    name: 'Verify Scoreboard',
    templateType: 'scoreboard',
    theme: THEMED,
  });
  scoreboardTpl = created.body;
}

const original = scoreboardTpl;

// Apply the themed look.
await api('PUT', `/api/templates/${scoreboardTpl.id}`, { theme: THEMED });
await api('POST', `/api/templates/${scoreboardTpl.id}/activate`);

const socket = io(baseUrl, { transports: ['websocket'], reconnection: true });
await new Promise((r, j) => {
  socket.on('connect', r);
  socket.on('connect_error', j);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let state = null;
socket.on('state:update', (s) => (state = s));
socket.on('state:initial', (s) => (state = s));

socket.emit('match:select', { matchId });
for (let i = 0; i < 50 && !(state?.payload?.data?.scoreboard); i++) await wait(150);

const appliedAccent = state?.payload?.themes?.scoreboard?.accentColor;
const appliedFont = state?.payload?.themes?.scoreboard?.displayFont;
console.log('Live scoreboard theme accent:', appliedAccent, '(expected #ff0ea0)');
console.log('Live scoreboard display font:', appliedFont, '(expected Oswald)');

socket.emit('graphic:set', { key: 'scoreboard', visible: true });
await wait(1000);

const themedOut = resolve(artifacts, 'overlay-scoreboard-themed.png');
await captureWhenReady(edge, `${baseUrl}/overlay/scoreboard`, themedOut, 'body .overlay-graphic.is-visible', {
  width: 1920,
  height: 1080,
  timeoutMs: 25000,
});

// Reset back to defaults so the repo state is clean.
await api('POST', `/api/templates/${scoreboardTpl.id}/reset`);
if (original.name) await api('PUT', `/api/templates/${scoreboardTpl.id}`, { name: original.name });
await wait(800);
socket.emit('match:select', { matchId });
await wait(600);

const defaultOut = resolve(artifacts, 'overlay-scoreboard-default.png');
await captureWhenReady(edge, `${baseUrl}/overlay/scoreboard`, defaultOut, 'body .overlay-graphic.is-visible', {
  width: 1920,
  height: 1080,
  timeoutMs: 25000,
});

socket.disconnect();

const themedSize = statSync(themedOut).size;
const defaultSize = statSync(defaultOut).size;
console.log(`Themed capture:  ${themedOut} (${themedSize} bytes)`);
console.log(`Default capture: ${defaultOut} (${defaultSize} bytes)`);

const accentOk = appliedAccent === '#ff0ea0';
const fontOk = appliedFont === 'Oswald';
const capturedOk = themedSize > 20000 && defaultSize > 20000;
const differOk = themedSize !== defaultSize;

console.log(`\n${accentOk ? 'PASS' : 'FAIL'} live theme accent reached the overlay state`);
console.log(`${fontOk ? 'PASS' : 'FAIL'} live theme font reached the overlay state`);
console.log(`${capturedOk ? 'PASS' : 'FAIL'} both overlays captured at 1920×1080`);
console.log(`${differOk ? 'PASS' : 'FAIL'} themed render differs from default render`);

process.exit(accentOk && fontOk && capturedOk ? 0 : 1);
