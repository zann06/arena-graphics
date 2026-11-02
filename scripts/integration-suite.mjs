/**
 * Phase 7 integration suite. Requires the server to be running on :4000.
 * Runs the REST + Socket.IO smoke tests, the OBS mock adapter test, and the
 * overlay capture/transparency checks, then prints a summary.
 *
 * Usage: node scripts/integration-suite.mjs
 */
import { spawnSync } from 'node:child_process';

const BASE = 'http://127.0.0.1:4000';

async function serverUp() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

if (!(await serverUp())) {
  console.error(`Server not reachable at ${BASE}. Start it first: node scripts/start-server.mjs`);
  process.exit(1);
}

const steps = [
  { name: 'Graphics / state recovery', cmd: 'node', args: ['scripts/graphics-smoke.mjs'] },
  { name: 'MLBB features', cmd: 'node', args: ['scripts/mlbb-smoke.mjs'] },
  { name: 'Templates & assets', cmd: 'node', args: ['scripts/phase6-smoke.mjs'] },
  { name: 'Template theme on air', cmd: 'node', args: ['scripts/verify-template-theme.mjs'] },
  { name: 'OBS adapter (mock)', cmd: 'pnpm', args: ['--filter', '@arena/server', 'test:obs'] },
  { name: 'Overlay captures', cmd: 'node', args: ['scripts/verify-overlays.mjs'] },
  { name: 'Overlay transparency + 1920×1080', cmd: 'node', args: ['scripts/verify-overlay-transparency.mjs'] },
];

const results = [];
for (const step of steps) {
  process.stdout.write(`\n==> ${step.name}\n`);
  const started = Date.now();
  const res = spawnSync(step.cmd, step.args, { stdio: 'inherit', shell: step.cmd === 'pnpm' });
  const ok = res.status === 0;
  results.push({ name: step.name, ok, ms: Date.now() - started });
}

console.log('\n================ SUMMARY ================');
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} (${(r.ms / 1000).toFixed(1)}s)`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} stages passed`);
process.exit(failed === 0 ? 0 : 1);
