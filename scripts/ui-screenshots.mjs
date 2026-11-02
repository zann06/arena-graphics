/**
 * Phase 4 UI smoke test: drives the built SPA with headless Edge and captures
 * screenshots of the Heroes library, Graphics Control and Monitor screens.
 *
 * Usage: node scripts/ui-screenshots.mjs [baseUrl]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4000';
const artifacts = resolve(process.cwd(), 'artifacts');
mkdirSync(artifacts, { recursive: true });

const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const edge = edgeCandidates.find((p) => existsSync(p));
if (!edge) {
  console.error('Edge not found');
  process.exit(1);
}

const shots = [
  { name: 'ui-heroes', path: '/dashboard/heroes' },
  { name: 'ui-control', path: '/dashboard/control' },
  { name: 'ui-monitor', path: '/monitor' },
  { name: 'ui-matches', path: '/dashboard/matches' },
  { name: 'ui-assets', path: '/dashboard/assets' },
  { name: 'ui-template-studio', path: '/dashboard/templates' },
];

let failures = 0;
for (const shot of shots) {
  const out = resolve(artifacts, `${shot.name}.png`);
  const url = `${baseUrl}${shot.path}`;
  try {
    execFileSync(
      edge,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=1600,1000',
        '--virtual-time-budget=9000',
        `--screenshot=${out}`,
        url,
      ],
      { stdio: 'ignore', timeout: 120000 }
    );
    const size = existsSync(out) ? statSync(out).size : 0;
    const ok = size > 20000;
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${shot.name} (${size} bytes) — ${url}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${shot.name} — ${err.message}`);
  }
}

console.log(`\n${failures === 0 ? 'ALL SCREENSHOTS CAPTURED' : `${failures} SCREENSHOT(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
