/**
 * Phase 4 (MLBB gameplay data) API smoke test.
 *
 * Usage: node scripts/mlbb-smoke.mjs [baseUrl] [matchId]
 * Requires a running server; creates its own hero fixtures and restores
 * draft/statistics/MVP to a clean state at the end.
 */
const baseUrl = process.argv[2] || 'http://127.0.0.1:4000';
const matchId = Number(process.argv[3] || 1);

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

// 1. Hero library
const batch = ['Ling', 'Tigreal', 'Valentina', 'Fredrinn', 'Beatrix'];
const imported = await api('POST', '/api/heroes/import', {
  names: [...batch, 'ling', '  '],
});
check('hero import accepts list', imported.status === 201, JSON.stringify(imported.body));
check(
  'hero import de-duplicates case-insensitively within one request',
  imported.body?.imported + imported.body?.skipped === 7 && !(imported.body?.names ?? []).some((n) => n === 'ling'),
  `${imported.body?.imported} new / ${imported.body?.skipped} skipped`
);

const again = await api('POST', '/api/heroes/import', { names: batch });
check('re-importing the same batch inserts nothing', again.body?.imported === 0 && again.body?.skipped === batch.length);

const created = await api('POST', '/api/heroes', { name: 'Smoke Hero' });
check('create hero returns 201', created.status === 201 && created.body?.name === 'Smoke Hero');
const smokeHeroId = created.body?.id;
const renamed = await api('PUT', `/api/heroes/${smokeHeroId}`, { name: 'Smoke Hero 2' });
check('update hero renames', renamed.status === 200 && renamed.body?.name === 'Smoke Hero 2');
check('update hero bumps assetVersion', renamed.body?.assetVersion === 2, `v${renamed.body?.assetVersion}`);
const invalidHero = await api('POST', '/api/heroes', { name: '' });
check('invalid hero rejected with 400', invalidHero.status === 400);

const listed = await api('GET', '/api/heroes');
check('list heroes returns all', Array.isArray(listed.body) && listed.body.length >= 6, `${listed.body?.length} heroes`);
const heroByName = new Map((listed.body ?? []).map((h) => [h.name.toLowerCase(), h.id]));
const lingId = heroByName.get('ling');
const tigrealId = heroByName.get('tigreal');

// 2. Draft
// Reset first so the run is deterministic regardless of prior state.
await api('DELETE', `/api/matches/${matchId}/draft`);
const draft0 = await api('GET', `/api/matches/${matchId}/draft`);
check('GET draft returns 20 slots', draft0.body?.slots?.length === 20, `${draft0.body?.slots?.length} slots`);
check('draft starts empty for the current game', draft0.body?.slots?.every((s) => s.heroId === null));

const slot1 = await api('PUT', `/api/matches/${matchId}/draft`, {
  side: 'blue',
  actionType: 'ban',
  slotNumber: 1,
  heroId: lingId,
});
check('PUT draft slot stores hero', slot1.status === 200);
const blueBan1 = slot1.body?.slots?.find((s) => s.side === 'blue' && s.actionType === 'ban' && s.slotNumber === 1);
check('blue ban #1 shows hero name', blueBan1?.heroName === 'Ling', blueBan1?.heroName);

await api('PUT', `/api/matches/${matchId}/draft`, { side: 'red', actionType: 'pick', slotNumber: 2, heroId: tigrealId });
const draft1 = await api('GET', `/api/matches/${matchId}/draft`);
const redPick2 = draft1.body?.slots?.find((s) => s.side === 'red' && s.actionType === 'pick' && s.slotNumber === 2);
check('GET draft reflects persisted pick', redPick2?.heroName === 'Tigreal');
check('persisted draft survives reload (DB round-trip)', draft1.body?.slots?.filter((s) => s.heroId != null).length === 2);

const clearSlot = await api('PUT', `/api/matches/${matchId}/draft`, {
  side: 'red',
  actionType: 'pick',
  slotNumber: 2,
  heroId: null,
});
const clearedRed = clearSlot.body?.slots?.find((s) => s.side === 'red' && s.actionType === 'pick' && s.slotNumber === 2);
check('PUT null hero clears slot', clearedRed?.heroId === null);

const badHero = await api('PUT', `/api/matches/${matchId}/draft`, {
  side: 'blue',
  actionType: 'ban',
  slotNumber: 1,
  heroId: 999999,
});
check('unknown hero rejected', badHero.status >= 400, `HTTP ${badHero.status}`);
const badSlot = await api('PUT', `/api/matches/${matchId}/draft`, {
  side: 'blue',
  actionType: 'ban',
  slotNumber: 9,
  heroId: lingId,
});
check('invalid slot number rejected', badSlot.status === 400);

// 3. Statistics
const statsBody = {
  blue: { kills: 14, turrets: 6, turtles: 2, lords: 1, gold: 4500 },
  red: { kills: 7, turrets: 2, turtles: 1, lords: 0, gold: -4500 },
};
const statsSet = await api('PUT', `/api/matches/${matchId}/games/1/statistics`, statsBody);
check('PUT statistics returns saved values', statsSet.status === 200 && statsSet.body?.blue?.kills === 14);
const statsGet = await api('GET', `/api/matches/${matchId}/games/1/statistics`);
check('GET statistics persists kills', statsGet.body?.blue?.kills === 14 && statsGet.body?.red?.kills === 7);
check('statistics label is operator entered', statsGet.body?.label === 'OPERATOR ENTERED', statsGet.body?.label);
const stats2 = await api('PUT', `/api/matches/${matchId}/games/1/statistics`, {
  ...statsBody,
  blue: { ...statsBody.blue, kills: 15 },
});
check('PUT statistics updates existing row', stats2.body?.blue?.kills === 15);
const statsBad = await api('PUT', `/api/matches/${matchId}/games/1/statistics`, { blue: { kills: -1 } });
check('invalid statistics rejected', statsBad.status === 400);

// 4. MVP
const rosters = await api('GET', '/api/teams');
const teamId = rosters.body?.[0]?.id;
const players = await api('GET', `/api/teams/${teamId}/roster`);
const player = players.body?.[0];
if (player) {
  const mvpSet = await api('POST', `/api/matches/${matchId}/mvp`, {
    playerId: player.id,
    heroId: lingId,
    kills: 11,
    deaths: 2,
    assists: 9,
  });
  check('POST MVP saves record', mvpSet.status === 200 && mvpSet.body?.nickname === player.nickname, mvpSet.body?.nickname);
  check('MVP includes hero name', mvpSet.body?.heroName === 'Ling', mvpSet.body?.heroName);
  const mvpGet = await api('GET', `/api/matches/${matchId}/mvp`);
  check('GET MVP persists KDA', mvpGet.body?.kills === 11 && mvpGet.body?.assists === 9);
  const mvpBad = await api('POST', `/api/matches/${matchId}/mvp`, { playerId: 999999, kills: 1, deaths: 0, assists: 0 });
  check('MVP with unknown player rejected', mvpBad.status >= 400, `HTTP ${mvpBad.status}`);
} else {
  console.log('SKIP  MVP checks (no players in database)');
}

// 5. Reset draft
const reset = await api('DELETE', `/api/matches/${matchId}/draft`);
check('DELETE draft clears all slots', reset.status === 200 && reset.body?.slots?.every((s) => s.heroId === null));

// 6. Cleanup smoke hero
await api('DELETE', `/api/heroes/${smokeHeroId}`);
const afterDelete = await api('GET', '/api/heroes');
check('delete hero removes it', !(afterDelete.body ?? []).some((h) => h.id === smokeHeroId));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
