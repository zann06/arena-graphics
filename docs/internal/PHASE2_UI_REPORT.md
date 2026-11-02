# Phase 2 (Frontend) — Management UI — Report

**Date:** 2026-11-02
**Status:** ✅ COMPLETE (core scope)
**Scope note:** This delivers the frontend half of *Phase 2 — Match management* from `DEVELOPMENT.md`. The next phase in that checklist is **Phase 3 — Graphics engine**.

---

## 1. Features delivered

- **Dashboard shell** with sidebar navigation (Tournaments, Teams, Players, Matches) and an Open Overlay shortcut.
- **Tournament management**: list table with color swatches, create/edit modal, delete confirmation.
- **Team management**: list table with tournament association and colors, create/edit modal, delete confirmation.
- **Player management**: list table with team, role, jersey number, create/edit modal with role selector and 1–99 jersey validation.
- **Match management**: list table with tournament, teams, BO format, status badge, live series score, winner.
- **Game result recording**: modal selecting game number, blue side, red side, winner and optional duration; invalid combinations rejected by the backend; series completion is reported back and the match auto-completes.
- **Data layer**: axios client with error normalization, TanStack Query hooks per entity, cache invalidation on mutations, Sonner toasts.
- **Backend hardening**:
  - SPA fallback so `/dashboard/*` and `/overlay/*` deep links serve the app instead of 404.
  - `/api/health` now reports real database status (`connected`), capabilities and `phase: 3`.
  - `@fastify/cors` registered for `http://localhost:5173` (dev) with verified `Access-Control-Allow-Origin`.
- **Culture of no mocks**: every table and score shown in the UI is fetched from the SQLite-backed API.

## 2. Files created or changed

**Created (web)**
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/query-client.ts`
- `apps/web/src/hooks/api/useTournaments.ts`
- `apps/web/src/hooks/api/useTeams.ts`
- `apps/web/src/hooks/api/usePlayers.ts`
- `apps/web/src/hooks/api/useMatches.ts`
- `apps/web/src/pages/TournamentsPage.tsx`
- `apps/web/src/pages/TeamsPage.tsx`
- `apps/web/src/pages/PlayersPage.tsx`
- `apps/web/src/pages/MatchesPage.tsx`
- `scripts/phase3-smoke.ps1`

**Changed**
- `apps/web/src/App.tsx` — providers, router, dashboard shell, page routes.
- `apps/web/package.json` — added `@tanstack/react-query`, `axios`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `zod`.
- `apps/server/src/index.ts` — CORS registration, SPA fallback in the 404 handler.
- `apps/server/src/routes/health.ts` — real DB probe, capabilities, phase.
- `DEVELOPMENT.md` — Phase 2 frontend checklist + notes.

## 3. Testing executed

1. `pnpm build` (web) — TypeScript + Vite production build.
2. `pnpm build` (server) — tsup ESM build.
3. `scripts/phase3-smoke.ps1` — full CRUD + series flow through the HTTP API.
4. Headless Edge screenshots against production server (`:4000`) for `/dashboard/tournaments` and `/dashboard/matches`.
5. Headless Edge screenshot against Vite dev server (`:5173`) for `/dashboard/players`.
6. CORS preflight/response header inspection with `Origin: http://localhost:5173`.
7. SPA deep-link checks for `/dashboard/tournaments`, `/dashboard/matches`, `/overlay/scoreboard`.

## 4. Results

| Check | Result |
|---|---|
| Web production build | ✅ 155 modules, `dist/assets/index-*.js` ~437.8 kB (gzip 132.2 kB) |
| Server build | ✅ ESM bundle ~97.4 kB |
| Health | ✅ `database: connected`, `phase: 3`, capabilities listed |
| Tournament create/update | ✅ 201 / 200 |
| Team + roster | ✅ teams created, roster returned 1 player |
| Player create | ✅ 201 |
| Match BO3 flow | ✅ 1-0 → 1-1 → 2-1, `isSeriesComplete: true`, match `status: completed`, winner set |
| Games listing | ✅ 3 games |
| Delete cascade | ✅ team deleted, remaining teams count correct |
| Tournament list UI | ✅ rendered real rows from API (screenshot) |
| Match list UI | ✅ rendered `BO3`, score `2 - 1`, `completed`, winner `RRQ*` (screenshot) |
| Player list UI (dev, :5173) | ✅ rendered real rows via CORS (screenshot) |
| SPA deep links | ✅ 200 with app HTML |

## 5. Issues encountered and fixes

1. **TS6133 unused helper** — `calculateSeriesScore` was unused inside `MatchesPage`; replaced with a per-row `<MatchScore>` component that fetches games for that match.
2. **Deep links returned 404** — `@fastify/static` returns 404 for unknown paths; added an SPA fallback for non-API GET requests.
3. **Health lied about the database** — it was hardcoded to `disconnected`; now probes `SELECT 1` through the libsql client.
4. **Dev-mode CORS missing** — `@fastify/cors` was a dependency but never registered; registered it and verified the header.

## 6. Known limitations

- No column sorting, pagination, or search on tables.
- No file upload for logos/photos (paths are text fields only).
- Forms are plain React state + HTML validation; Zod/react-hook-form are installed but not yet wired to every form.
- No browser-automation test suite yet (Playwright/Vitest not installed); UI verification used headless Edge screenshots plus API smoke tests.

## 7. Next phase

**Phase 3 — Graphics engine** (per `DEVELOPMENT.md`):
- Fixed 1920×1080 overlay stage with proportional scaling.
- Transparent overlay shell, no margins/scrollbars.
- Initial state snapshot and reconnect/resync.
- Graphic visibility lifecycle (preview/show/hide/entrance/exit).
- Scoreboard, player intro, team intro, fullscreen overlays.
- Verify in OBS Browser Source.
