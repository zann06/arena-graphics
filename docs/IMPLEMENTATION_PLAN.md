# ARENA GRAPHICS — Implementation Plan

**Status:** Phase 1 (Foundation) — in progress  
**Last updated:** 2026-11-01  
**Source of truth:** `PRD.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `OBS-SETUP.md`, `prompt.md`

---

## 1. Environment audit (verified)

| Item | Result | Notes |
|---|---|---|
| Working directory | `C:\project\ARENA_GRAPHICS_Documentation` | Contains specification documents only. No application source existed. |
| Git | `git 2.50.1.windows.1` | Directory was **not** a Git repository at audit time. Repository initialized during Phase 1; no remote configured and nothing pushed. |
| Node.js | `v25.2.1` | Satisfies Vite 7 / Fastify 5 / Socket.IO 4 requirements. |
| npm | `11.6.2` | Used only for registry version inspection. |
| pnpm | `10.28.2` | Matches `packageManager`; workspace enabled. |
| corepack | Not available | Not required; pnpm is installed directly. |
| Ports 4000 / 5173 / 4173 | Free | Backend `4000`, Vite dev server `5173`. |
| `node:sqlite` | Works (experimental warning) | Not used directly; see database decision below. |
| OBS Studio | Not verified in Phase 1 | Real OBS verification is a Phase 5 activity. No OBS claims are made yet. |

## 2. Architecture decisions

1. **Workspace layout** follows `ARCHITECTURE.md`: `apps/web`, `apps/server`, `packages/shared`, `packages/graphics-core`, plus `database/`, `scripts/`, `docs/`.
2. **TypeScript 5.9.3 is pinned.** The registry's TypeScript 7.0.2 is outside the supported peer range of `typescript-eslint` 8.72 (`<6.1.0`). Using TS 7 would break linting.
3. **SQLite driver: `@libsql/client` + `drizzle-orm/libsql`.** It is N-API based, so it does not require a native rebuild against Node 25 (a real risk with `better-sqlite3` on a brand-new Node major). It supports local `file:` URLs and Drizzle migrations.
4. **Data directory** defaults to `%LOCALAPPDATA%\ArenaGraphics`, never inside the source tree. Tests use an isolated in-memory/temporary database.
5. **Shared packages export TypeScript source** (`exports: ./src/index.ts`). Vite and `tsx` consume it directly in development; the server production build is bundled with `tsup`. This avoids a stale `dist` build step during development while keeping one source of truth.
6. **Single authoritative backend.** The server owns state revisions and emits typed envelopes. Phase 1 establishes the envelope, snapshot, and Socket.IO channel; no client-side authoritative match mutation exists.
7. **Honest capability flags.** `/api/health` reports `capabilities` and `phase`. The dashboard uses these flags to lock navigation for features that do not exist yet. No screen is presented as working before it is implemented.
8. **Original visual identity.** Custom ARENA mark, navy/cyan palette from the PRD, Barlow Condensed display type + Inter UI type, angular panels. No MPL trademarks, artwork, or layout copies.
9. **Ports and URLs are configuration, not assumptions.** `.env.example` documents them; OBS-SETUP tells operators to use the printed ports.
10. **Local-only default.** `HOST=127.0.0.1`. CORS is restricted to `WEB_ORIGIN`.

## 3. Phase 1 scope (this milestone)

### In scope
- pnpm workspace, root scripts, TypeScript, ESLint, Prettier, Git ignore rules.
- `packages/shared`: domain constants, entity schemas, health schema, realtime envelope, Socket.IO event contracts, capability flags.
- `packages/graphics-core`: 1920×1080 logical canvas math, stage scaling, animation timing primitives, unit tests.
- `apps/server`: Fastify 5 app factory, env validation, structured errors, CORS, health endpoint, SQLite/Drizzle client + full MVP schema + generated migration, migration/seed scripts, Socket.IO with authoritative snapshot and latency probe, graceful shutdown.
- `apps/web`: React 19 + Vite 7 + Tailwind CSS 4 dashboard shell, responsive sidebar/topbar, live system status, realtime diagnostics, activity feed, roadmap with honest states, toasts, 404 route.
- PowerShell setup/start/verify scripts.
- Unit + integration tests for the above.
- Documentation updates (`README.md` runbook section, `DEVELOPMENT.md` checklist/work log, this plan).

### Explicitly out of scope in Phase 1
- Tournament/team/player/match CRUD screens (Phase 2).
- Overlay routes and broadcast graphic rendering (Phase 3). Overlay URLs are not advertised as working.
- Draft, statistics, MVP modules (Phase 4).
- OBS WebSocket adapter (Phase 5). OBS status is shown as "not configured", not as connected.
- Asset uploads and Template Studio (Phase 6).
- Playwright E2E suite and real OBS verification (Phase 7 / Phase 5 respectively).

## 4. Phase plan

| Phase | Deliverable | Exit criteria |
|---|---|---|
| 1 Foundation | Workspace, shared contracts, DB, API, realtime channel, dashboard shell | `typecheck`, `lint`, `test`, `build` pass; health + snapshot verified by integration test; dashboard renders real status |
| 2 Match management | Tournament/team/player/match CRUD, BO rules, results, derived series score, event history | CRUD integration tests; score/result unit tests; dashboard session card driven by real data |
| 3 Graphics engine | 1920×1080 transparent overlay shell, scaling, lifecycle, scoreboard, intros, fullscreen | Overlay state recovery test; visual check in Chromium; Browser Source check in OBS |
| 4 MLBB modules | Hero library, draft slots/controls, statistics, MVP | Draft rule tests; overlay rendering; correction/reset safety tests |
| 5 OBS integration | Backend adapter, auth, scenes, source visibility, reconnection | Mocked adapter tests + documented real OBS smoke test |
| 6 Template Studio & assets | Uploads, validation, template persistence/duplication/reset | Upload validation tests; overlay reflects template changes |
| 7 QA & release | Unit/integration/E2E, performance, docs, release notes | Full verification matrix; clean Windows setup walkthrough |

## 5. Realtime and state design (foundation)

```ts
type EventEnvelope<T> = {
  eventId: string;   // UUID issued by server
  matchId: string;   // "" when no match is selected
  revision: number;  // monotonic server revision
  timestamp: string; // ISO-8601
  payload: T;
};
```

- Client emits `state:request`; server replies with `state:initial` and the current authoritative snapshot (also used on reconnect).
- `system:ping` / `system:pong` provides a real latency and clock-offset measurement for diagnostics.
- Graphic lifecycle values (`hidden`, `entering`, `visible`, `exiting`) are defined now; transitions and commands arrive in Phase 3.
- Series scores will be derived from completed games in Phase 2, never accepted from clients.

## 6. Testing strategy for Phase 1

| Layer | Tool | Coverage |
|---|---|---|
| Shared contracts | Vitest | Health schema, envelope, graphic state validation |
| Graphics core | Vitest | Letterbox scaling, portrait/ultrawide viewports, zero-size guards |
| Server | Vitest + Fastify `inject` | `/api/health` shape and DB check; 404 error shape; migration application |
| Realtime | Vitest + `socket.io-client` | `state:initial` snapshot, revision, ping ack |
| Web utilities | Vitest | Time/uptime/latency formatting used by the dashboard |
| Static checks | `tsc --noEmit`, ESLint | All packages |
| Production build | Vite + tsup | Web bundle + server bundle |

## 7. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Node 25 native module incompatibility | Server cannot start | Chose N-API `@libsql/client`; verified at runtime during Phase 1 |
| TypeScript 7 vs. tooling | Lint/typecheck breakage | Pinned TS 5.9.3; documented |
| Windows path handling for `file:` URLs | DB open failure | Normalize to forward slashes; integration test uses real file DB |
| pnpm 10 blocks lifecycle scripts | esbuild binary missing | `onlyBuiltDependencies: [esbuild]` |
| Scope creep into overlays | Unverified features claimed | Capability flags + explicit phase gates |
| OBS unavailable in CI/dev | False "verified" claims | OBS remains unclaimed until Phase 5 real test |
| Two clients overwriting state | Data loss | Server-owned revision/envelope foundation; command validation in Phase 2/3 |

## 8. Phase 1 acceptance checklist

- [ ] `pnpm install` succeeds from a clean tree.
- [ ] `pnpm db:migrate` creates the SQLite database and records the migration.
- [ ] `pnpm dev` starts API on 4000 and dashboard on 5173.
- [ ] `/api/health` returns `status: "ok"` with database and realtime details.
- [ ] Dashboard shows live socket state, latency, revision, and real server/DB data.
- [ ] Locked navigation truthfully reflects unimplemented phases.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
- [ ] No secrets committed; `.env` ignored.

## 9. Assumptions

- One local operator is sufficient for MVP; no auth in Phase 1 (localhost binding only).
- The documentation folder is the project root; specification files stay at the root.
- Asset files will live outside the repository under `%LOCALAPPDATA%\ArenaGraphics\assets` in later phases.
- OBS Browser Source will load the Vite dev URL in development and the backend-served URL in production.
