/**
 * Waits for a selector to exist in a live page, then captures a 1920x1080 PNG.
 *
 * Headless Edge's `--screenshot` fires on a virtual-time clock and often beats
 * the real-time Socket.IO handshake, producing blank overlay captures. This
 * helper instead drives Chrome DevTools Protocol over the built-in WebSocket:
 * it opens the page, polls `Runtime.evaluate` until the expected DOM nodes have
 * rendered, and only then asks for a screenshot.
 *
 * Usage (as a module):
 *   import { captureWhenReady } from './cdp-shot.mjs';
 *   await captureWhenReady(edgePath, url, outPath, 'body .overlay-graphic.is-visible', { width, height });
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpJson(url) {
  return fetch(url).then((r) => r.json());
}

let debugSeq = 0;

export async function captureWhenReady(edgePath, url, outPath, readySelector, { width = 1920, height = 1080, timeoutMs = 30000, port, transparent = false } = {}) {
  const debugPort = port ?? 9333 + (debugSeq++ % 50);
  const userDataDir = `${process.env.TEMP || '/tmp'}/arena-cdp-${Date.now()}-${debugSeq}`;

  const edge = spawn(
    edgePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    // Wait for the DevTools endpoint.
    let version = null;
    for (let i = 0; i < 60 && !version; i++) {
      try {
        version = await httpJson(`http://127.0.0.1:${debugPort}/json/version`);
      } catch {
        await sleep(250);
      }
    }
    if (!version) throw new Error('DevTools endpoint never came up');

    const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, {
      method: 'PUT',
    }).then((r) => r.json());
    const wsUrl = target.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);
    await new Promise((r, j) => {
      ws.addEventListener('open', r);
      ws.addEventListener('error', j);
    });

    let id = 1;
    const send = (method, params) =>
      new Promise((resolve, reject) => {
        const myId = id++;
        const onMsg = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.id === myId) {
            ws.removeEventListener('message', onMsg);
            if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: myId, method, params }));
      });

    // Force a real 1920x1080 layout before the app mounts, so OverlayStage
    // computes scale = 1 (a 754px default viewport produced squished captures).
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setVisibleSize', { width, height }).catch(() => {});
    await send('Page.navigate', { url });
    await sleep(500);

    // Also make sure the window size matches (headless launch may be smaller).
    const verify = await send('Runtime.evaluate', { expression: 'window.innerWidth', returnByValue: true });
    if (verify?.result?.value !== width) {
      // Retry with a slightly later override (some builds need it after nav).
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await send('Page.reload', { ignoreCache: true });
      await sleep(500);
    }
    console.log(`[cdp-shot] viewport ${JSON.stringify(
      (await send('Runtime.evaluate', { expression: '({w: window.innerWidth, h: window.innerHeight})', returnByValue: true }))?.result?.value
    )} (target ${width}x${height})`);

    // Poll until the readiness condition is met. `readySelector` may be a CSS
    // selector (element must exist and be visible) or a JS expression returning
    // a boolean (prefixed with "js:").
    const runEval = (expression) =>
      send('Runtime.evaluate', { expression, returnByValue: true }).then((r) => r?.result?.value);

    const isJs = readySelector.startsWith('js:');
    const jsExpr = readySelector.slice(3);
    const probe = isJs
      ? jsExpr
      : `(() => { const el = document.querySelector(${JSON.stringify(readySelector)}); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`;

    const deadline = Date.now() + timeoutMs;
    let ready = false;
    while (Date.now() < deadline) {
      const found = await runEval(probe);
      if (found === true) {
        ready = true;
        break;
      }
      await sleep(300);
    }
    if (!ready) {
      const info = await runEval('document.body.innerHTML.slice(0, 400)');
      throw new Error(`Ready condition (${readySelector}) not met.\nDOM: ${info}`);
    }

    // Let CSS transitions settle.
    await sleep(600);

    // For overlays, capture with a transparent page background so the PNG
    // reflects exactly what OBS composites (alpha preserved).
    if (transparent) {
      await send('Emulation.setDefaultBackgroundColorOverride', {
        color: { r: 0, g: 0, b: 0, a: 0 },
      }).catch(() => {});
      await sleep(150);
    }

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    ws.close();
    return true;
  } finally {
    try {
      edge.kill();
    } catch {
      /* ignore */
    }
  }
}
