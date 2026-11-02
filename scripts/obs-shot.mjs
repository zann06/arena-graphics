/**
 * Captures the OBS Integration page once its status card has rendered.
 *
 * Usage: node scripts/obs-shot.mjs
 */
import { existsSync, statSync } from 'node:fs';
import { captureWhenReady } from './cdp-shot.mjs';

const baseUrl = 'http://127.0.0.1:4000';
const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p));

const out = 'artifacts/ui-obs.png';
await captureWhenReady(
  edge,
  `${baseUrl}/dashboard/obs`,
  out,
  'js:document.body.innerText.toUpperCase().includes("OBS CONNECTION")',
  { width: 1600, height: 1100, timeoutMs: 25000 }
);
console.log(`captured ${out}: ${statSync(out).size} bytes`);
process.exit(0);
