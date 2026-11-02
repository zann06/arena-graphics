/**
 * Starts/stops the API + realtime server as a detached process and waits until
 * /api/health answers.
 *
 * Detaching on Windows: the tool's shell is a job object that reaps child
 * processes when the command finishes. `spawn(..., { detached: true })` plus
 * `unref()` escapes it, but stdio MUST be real file descriptors — piping the
 * child's stdout through the parent (child.stdout.pipe) keeps a live handle and
 * the server dies with the shell. So we hand it an opened fd instead.
 *
 * Usage: node scripts/start-server.mjs [--stop]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const serverDir = resolve(root, 'apps/server');
const artifacts = resolve(root, 'artifacts');
const logPath = resolve(artifacts, 'server.log');
const errPath = resolve(artifacts, 'server.err.log');
const pidPath = resolve(artifacts, 'server.pid');
const healthUrl = 'http://127.0.0.1:4000/api/health';

if (!existsSync(artifacts)) mkdirSync(artifacts, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopServer() {
  if (!existsSync(pidPath)) return;
  const pid = Number(readFileSync(pidPath, 'utf8').trim());
  if (pid && alive(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone */
    }
    // Wait briefly for a graceful exit, then force it.
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && alive(pid)) {
      // busy wait is fine for <=5s on shutdown
      const wait = Date.now() + 200;
      while (Date.now() < wait) {
        /* spin */
      }
    }
    if (alive(pid)) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* gone */
      }
    }
  }
  try {
    unlinkSync(pidPath);
  } catch {
    /* ignore */
  }
}

async function waitHealthy(timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        const body = await res.json();
        if (body.status === 'ok') return body;
      }
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  return null;
}

stopServer();

if (process.argv.includes('--stop')) {
  console.log('Server stopped.');
  process.exit(0);
}

await sleep(600);

const outFd = openSync(logPath, 'w');
const errFd = openSync(errPath, 'w');
const child = spawn(process.execPath, ['dist/index.js'], {
  cwd: serverDir,
  stdio: ['ignore', outFd, errFd],
  detached: true,
  windowsHide: true,
});
child.unref();
writeFileSync(pidPath, String(child.pid), 'utf8');
console.log(`Server process started (pid ${child.pid}); log: ${logPath}`);

const health = await waitHealthy();
if (!health) {
  console.error('Server did not become healthy. See artifacts/server.log and artifacts/server.err.log');
  process.exit(1);
}
console.log(`Healthy: ${JSON.stringify(health)}`);
process.exit(0);
