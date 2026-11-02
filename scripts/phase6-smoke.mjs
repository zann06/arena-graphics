// Phase 6 smoke test: templates CRUD/activate/duplicate/reset + asset upload/list/delete.
// Run: node scripts/phase6-smoke.mjs

const BASE = 'http://127.0.0.1:4000';
let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err instanceof Error ? err.message : err}`);
    failed += 1;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

// 1×1 PNG for upload tests.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function upload(kind, buffer, filename, mime) {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', new Blob([buffer], { type: mime }), filename);
  const res = await fetch(`${BASE}/api/assets/upload`, { method: 'POST', body: form });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

console.log('Phase 6 smoke test — templates & assets\n');

// ---- Templates -------------------------------------------------------------
let templates = [];
await check('GET /api/templates returns seeded templates (one per type)', async () => {
  const { status, data } = await json('GET', '/api/templates');
  assert(status === 200, `status ${status}`);
  assert(Array.isArray(data) && data.length >= 7, `expected >=7 templates, got ${data?.length}`);
  templates = data;
  const types = new Set(data.map((t) => t.templateType));
  for (const t of ['scoreboard', 'playerIntro', 'teamIntro', 'draft', 'statistics', 'mvp', 'fullscreen']) {
    assert(types.has(t), `missing template type ${t}`);
  }
});

await check('each graphic type has exactly one active template', async () => {
  const byType = new Map();
  for (const t of templates) {
    if (!t.isActive) continue;
    byType.set(t.templateType, (byType.get(t.templateType) ?? 0) + 1);
  }
  for (const [type, count] of byType) assert(count === 1, `${type} has ${count} active templates`);
});

let createdId = null;
let previousActiveScoreboardId = null;
await check('POST /api/templates creates a custom template', async () => {
  previousActiveScoreboardId =
    templates.find((t) => t.templateType === 'scoreboard' && t.isActive)?.id ?? null;
  const { status, data } = await json('POST', '/api/templates', {
    name: 'Smoke Scoreboard',
    templateType: 'scoreboard',
    theme: {
      accentColor: '#ff2d55',
      panelColor: '#101018',
      textColor: '#ffffff',
      displayFont: 'Oswald',
      scale: 1.05,
      radius: 12,
      showAccentBar: true,
    },
  });
  assert(status === 201, `status ${status}: ${JSON.stringify(data)}`);
  assert(data.id && data.theme.accentColor === '#ff2d55', 'created template mismatch');
  assert(data.isActive === false, 'new template should start inactive');
  createdId = data.id;
});

await check('POST create rejects an invalid color', async () => {
  const { status } = await json('POST', '/api/templates', {
    name: 'Bad',
    templateType: 'scoreboard',
    theme: {
      accentColor: 'red',
      panelColor: '#101018',
      textColor: '#ffffff',
      displayFont: 'Oswald',
      scale: 1,
      radius: 0,
      showAccentBar: true,
    },
  });
  assert(status === 400, `expected 400, got ${status}`);
});

await check('PUT /api/templates/:id updates theme fields', async () => {
  const { status, data } = await json('PUT', `/api/templates/${createdId}`, {
    name: 'Smoke Scoreboard v2',
    theme: {
      accentColor: '#00e676',
      panelColor: '#101018',
      textColor: '#ffffff',
      displayFont: 'Rajdhani',
      scale: 1.1,
      radius: 18,
      showAccentBar: false,
    },
  });
  assert(status === 200, `status ${status}`);
  assert(data.name === 'Smoke Scoreboard v2', 'name not updated');
  assert(data.theme.accentColor === '#00e676' && data.theme.scale === 1.1, 'theme not updated');
});

await check('POST /api/templates/:id/activate makes it the active scoreboard', async () => {
  const { status, data } = await json('POST', `/api/templates/${createdId}/activate`);
  assert(status === 200 && data.isActive === true, `status ${status}`);

  const all = (await json('GET', '/api/templates')).data;
  const activeScoreboards = all.filter((t) => t.templateType === 'scoreboard' && t.isActive);
  assert(activeScoreboards.length === 1, `expected 1 active scoreboard, got ${activeScoreboards.length}`);
  assert(activeScoreboards[0].id === createdId, 'wrong scoreboard active');
});

await check('live state payload carries the active theme for scoreboard', async () => {
  // The live state is delivered over Socket.IO; connect briefly to read it.
  const { io } = await import('socket.io-client');
  const socket = io(BASE, { transports: ['websocket'], reconnection: false, timeout: 4000 });
  const state = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for state:initial')), 5000);
    socket.on('connect', () => socket.emit('state:request'));
    socket.on('state:initial', (s) => {
      clearTimeout(timer);
      resolve(s);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
  socket.close();
  assert(state?.payload?.themes?.scoreboard, 'state payload.themes.scoreboard missing');
  assert(
    state.payload.themes.scoreboard.accentColor === '#00e676',
    `expected active theme #00e676, got ${state.payload.themes.scoreboard.accentColor}`
  );
});

await check('POST /api/templates/:id/duplicate creates an inactive copy', async () => {
  const { status, data } = await json('POST', `/api/templates/${createdId}/duplicate`);
  assert(status === 201, `status ${status}`);
  assert(data.id !== createdId && data.name.includes('copy'), 'duplicate mismatch');
  assert(data.isActive === false, 'duplicate should be inactive');
  // Clean up the copy so repeated runs do not accumulate templates.
  await json('DELETE', `/api/templates/${data.id}`);
});

await check('POST /api/templates/:id/reset restores the default theme', async () => {
  const { status, data } = await json('POST', `/api/templates/${createdId}/reset`);
  assert(status === 200, `status ${status}`);
  assert(data.theme.accentColor === '#237bff' && data.theme.scale === 1, 'theme not reset to default');
});

await check('DELETE /api/templates/:id removes a template', async () => {
  const { status } = await json('DELETE', `/api/templates/${createdId}`);
  assert(status === 200, `status ${status}`);
  const { status: getStatus } = await json('GET', `/api/templates/${createdId}`);
  assert(getStatus === 404, `expected 404 after delete, got ${getStatus}`);
  // Restore whichever scoreboard template was active before this run.
  if (previousActiveScoreboardId) {
    await json('POST', `/api/templates/${previousActiveScoreboardId}/activate`);
  }
});

// ---- Assets ----------------------------------------------------------------
let assetId = null;
let assetUrl = null;
await check('POST /api/assets/upload stores a PNG with dimensions', async () => {
  const { status, data } = await upload('teams', PNG_1x1, 'logo.png', 'image/png');
  assert(status === 201, `status ${status}: ${JSON.stringify(data)}`);
  assert(data.width === 1 && data.height === 1, `expected 1x1, got ${data.width}x${data.height}`);
  assert(data.url.startsWith('/uploads/teams/'), `unexpected url ${data.url}`);
  assetId = data.id;
  assetUrl = data.url;
});

await check('uploaded asset is served at /uploads/*', async () => {
  const res = await fetch(`${BASE}${assetUrl}`);
  assert(res.status === 200, `status ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  assert(buf.equals(PNG_1x1), 'served bytes differ from uploaded bytes');
});

await check('miss on /uploads/* returns 404 (not SPA HTML)', async () => {
  const res = await fetch(`${BASE}/uploads/teams/does-not-exist.png`);
  assert(res.status === 404, `expected 404, got ${res.status}`);
  const ct = res.headers.get('content-type') ?? '';
  assert(!ct.includes('text/html'), `expected non-html, got ${ct}`);
});

await check('GET /api/assets?kind=teams lists the upload', async () => {
  const { status, data } = await json('GET', '/api/assets?kind=teams');
  assert(status === 200, `status ${status}`);
  assert(data.some((a) => a.id === assetId), 'uploaded asset not listed');
});

await check('upload rejects a disallowed MIME type', async () => {
  const { status } = await upload('teams', Buffer.from('not an image'), 'evil.txt', 'text/plain');
  assert(status === 415, `expected 415, got ${status}`);
});

await check('upload rejects an invalid kind', async () => {
  const { status } = await upload('not-a-kind', PNG_1x1, 'logo.png', 'image/png');
  assert(status === 400, `expected 400, got ${status}`);
});

await check('DELETE /api/assets/:id removes row and file', async () => {
  const { status } = await json('DELETE', `/api/assets/${assetId}`);
  assert(status === 200, `status ${status}`);
  const res = await fetch(`${BASE}${assetUrl}`);
  assert(res.status === 404, `file still served after delete (${res.status})`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
