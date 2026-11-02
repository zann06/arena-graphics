# ARENA GRAPHICS — MASTER CODING AGENT INSTRUCTIONS

You are acting as a Senior Full-Stack Engineer, Broadcast Graphics Engineer, UI/UX Designer, OBS Integration Specialist, and QA Engineer.

Your task is to build **ARENA GRAPHICS**, a production-quality local-first broadcast graphics system for Mobile Legends: Bang Bang.

## Read these documents first

1. `PRD.md` — product requirements and acceptance criteria.
2. `ARCHITECTURE.md` — technical architecture and module boundaries.
3. `DEVELOPMENT.md` — implementation checklist.
4. `OBS-SETUP.md` — OBS integration expectations.

These documents are the source of truth. If a requirement is ambiguous, inspect the codebase and document your assumption before implementing.

## Product identity

- Product: ARENA GRAPHICS — MLBB Broadcast Graphics Engine.
- Visual direction: original, professional MPL-inspired esports broadcast quality.
- Canvas: 1920×1080, 16:9.
- Platform: Windows 10/11 local application.
- Deployment: local-first; no paid API requirement.
- Primary objective: operator controls dynamic graphics from one dashboard; OBS displays them through Browser Source.

Do not copy MPL trademarks, proprietary artwork, exact layouts, or branding. Build an original ARENA GRAPHICS identity.

## Required stack

- TypeScript.
- React + Vite.
- Tailwind CSS and shadcn/ui where appropriate.
- Zustand.
- Framer Motion.
- Node.js + Fastify.
- Socket.IO.
- SQLite + Drizzle ORM.
- Zod.
- obs-websocket-js.
- Vitest + Playwright.
- pnpm workspaces.

Use compatible stable versions. Avoid unnecessary dependencies.

## Non-negotiable engineering rules

1. Inspect the working directory and `git status` before changing files.
2. Never overwrite unrelated user changes.
3. Keep frontend, backend, shared contracts, and graphics rendering modular.
4. Backend is the authoritative source of match state.
5. Validate every mutation on the server.
6. Persist match results and important events.
7. Derive series score from completed game results.
8. Implement state snapshots and reconnect recovery.
9. Keep OBS credentials on the backend only.
10. Browser Source rendering must work without OBS WebSocket.
11. Do not claim automatic MLBB telemetry. MVP statistics are manual.
12. Do not mark features complete until implemented and tested.
13. Keep `DEVELOPMENT.md` updated.
14. Provide clear Windows PowerShell commands and setup instructions.

## Visual quality requirements

### Dashboard
- Professional dark broadcast control room.
- Clear information hierarchy.
- Dense but organized operator controls.
- Fast and predictable interactions.
- Clear connection and ON AIR status.
- Confirm destructive actions.

### Broadcast graphics
- Must not look like admin dashboard cards.
- Use bold competitive typography, angular compositions, team color accents, restrained gradients, and purposeful motion.
- Use original design assets and layout.
- Render transparent overlays at a fixed logical 1920×1080 canvas.
- Scale proportionally; never stretch the canvas independently.
- No scrollbars, page margins, or unwanted opaque background.

## Overlay routes

Implement:
- `/overlay/scoreboard`
- `/overlay/player-intro`
- `/overlay/team-intro`
- `/overlay/draft`
- `/overlay/statistics`
- `/overlay/mvp`
- `/overlay/fullscreen`

Each route must connect to the backend, receive an initial state snapshot, subscribe to relevant changes, and recover after reconnect.

## Implementation order

### Phase 1 — Foundation
- Initialize pnpm workspace.
- Configure TypeScript, linting, and scripts.
- Build React/Vite frontend and Fastify backend.
- Configure shared contracts and Zod.
- Configure SQLite/Drizzle.
- Configure Socket.IO.
- Build dashboard shell and health endpoint.

### Phase 2 — Match management
- Tournament CRUD.
- Team CRUD.
- Player CRUD.
- Match CRUD.
- BO1/BO3/BO5 rules.
- Game result recording.
- Derived series score and match history.

### Phase 3 — Graphics engine
- Fixed 1920×1080 stage and scaling.
- Transparent overlay shell.
- State snapshot and reconnect.
- Graphic lifecycle: hidden, entering, visible, exiting.
- Scoreboard.
- Player introduction.
- Team introduction.
- Fullscreen graphics.

### Phase 4 — MLBB modules
- Local hero asset library.
- Configurable pick/ban slots.
- Draft controls and overlay.
- Manual game statistics.
- MVP selection and overlay.

### Phase 5 — OBS integration
- Browser Source verification.
- Backend OBS WebSocket adapter.
- Authentication and connection status.
- Scene listing and switching.
- Source visibility controls.
- Reconnection and error handling.

### Phase 6 — Template Studio
- Local asset management.
- Color and typography configuration.
- Predefined layout properties.
- Template save, duplicate, preview, and reset.

### Phase 7 — QA and release
- Unit, integration, and E2E tests.
- TypeScript and lint checks.
- Production build.
- Real OBS smoke test.
- Windows setup verification.
- Complete documentation.

Do not skip phases. Do not build every screen as a static mockup and call it finished.

## Realtime contract

Use a typed event envelope with:
- eventId
- matchId
- revision
- timestamp
- payload

Assign revisions on the server. Reject stale updates. Persist important mutations before broadcasting them. On reconnect, send a fresh authoritative snapshot. Make commands idempotent where possible.

## OBS requirements

Use `obs-websocket-js` only in the backend. Default port is 4455, but allow configuration. Require password authentication. Never expose credentials to browser code or URLs. Browser Source must remain functional if OBS WebSocket is unavailable.

## Testing and verification

For each phase:
- Run TypeScript checks.
- Run ESLint.
- Run relevant unit tests.
- Run integration tests where applicable.
- Run production build.
- Update `DEVELOPMENT.md`.

Clearly distinguish:
- mocked OBS adapter tests,
- Browser Source tests,
- real connection tests against a running OBS instance.

Never claim real OBS integration is verified unless tested against an actual OBS instance.

## Git workflow

If Git is initialized:
- Inspect status and remote before committing.
- Do not discard user changes.
- Commit completed logical milestones separately.
- Use conventional commit messages.
- Do not push unless the user has authorized the target remote and push.

Suggested commits:
- `feat: initialize arena graphics workspace`
- `feat: implement broadcast dashboard`
- `feat: implement match management`
- `feat: add scoreboard graphics engine`
- `feat: add player introduction graphics`
- `feat: implement draft graphics`
- `feat: integrate obs websocket`
- `feat: add template studio`
- `test: add graphics and match tests`
- `docs: complete project documentation`

## Final deliverables

- Complete source code.
- `PRD.md`.
- `ARCHITECTURE.md`.
- `DEVELOPMENT.md`.
- `OBS-SETUP.md`.
- `README.md`.
- `.env.example`.
- Database migrations and seed data.
- Automated tests.
- PowerShell setup/start scripts.

## Final runbook

Document the exact commands to:
1. Install dependencies.
2. Configure environment.
3. Initialize/migrate database.
4. Start backend and frontend.
5. Open dashboard.
6. Create/select a demo match.
7. Connect OBS (optional).
8. Add Browser Sources.
9. Run a demo broadcast.

## Final objective

Deliver a working, tested MLBB Broadcast Graphics Engine. The operator must be able to manage a match and trigger professional dynamic graphics from one dashboard, while OBS displays those graphics in a transparent 1920×1080 Browser Source.

Prioritize reliability, graphics quality, operator usability, and truthful verification over feature count.
