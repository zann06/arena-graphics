# ARENA GRAPHICS — Technical Architecture

## 1. Architecture summary

Use a **modular monolith** with two runtime applications:
- `apps/web`: React dashboard and independently addressable overlay routes.
- `apps/server`: Fastify API, Socket.IO server, database access, asset handling, and OBS WebSocket adapter.

Shared packages:
- `packages/shared`: contracts, Zod schemas, event names, constants.
- `packages/graphics-core`: canvas sizing, animation helpers, reusable graphic primitives and template utilities.

This keeps deployment simple for a single Windows laptop while preserving clear module boundaries.

## 2. Runtime topology

```text
Operator Browser
   | HTTPS/HTTP + Socket.IO (localhost)
   v
React/Vite Web App ----------------------+
   |                                     |
   | API + Socket.IO                     | OBS Browser Source loads
   v                                     v
Fastify + Socket.IO Server          /overlay/*
   |                                     |
   +---- Match/Graphics State ------------+
   |
   +---- SQLite (Drizzle)
   |
   +---- Local Asset Directory
   |
   +---- OBS Adapter (obs-websocket-js)
                 |
                 v
             OBS Studio
```

In development, Vite serves the frontend and proxies API/socket requests to the backend. In packaged/local production, serve the built frontend from the backend or a local static server. Keep overlay URLs stable.

## 3. Suggested workspace

```text
arena-graphics/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       │   ├── dashboard/
│   │       │   ├── tournaments/
│   │       │   ├── teams/
│   │       │   ├── players/
│   │       │   ├── matches/
│   │       │   ├── graphics/
│   │       │   ├── draft/
│   │       │   ├── statistics/
│   │       │   ├── templates/
│   │       │   └── obs/
│   │       ├── overlays/
│   │       │   ├── scoreboard/
│   │       │   ├── player-intro/
│   │       │   ├── team-intro/
│   │       │   ├── draft/
│   │       │   ├── statistics/
│   │       │   ├── mvp/
│   │       │   └── fullscreen/
│   │       ├── hooks/
│   │       ├── stores/
│   │       ├── services/
│   │       └── styles/
│   └── server/
│       └── src/
│           ├── modules/
│           │   ├── tournaments/
│           │   ├── teams/
│           │   ├── players/
│           │   ├── matches/
│           │   ├── draft/
│           │   ├── graphics/
│           │   ├── assets/
│           │   └── obs/
│           ├── websocket/
│           ├── database/
│           ├── middleware/
│           ├── services/
│           └── config/
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── events/
│   │   └── constants/
│   └── graphics-core/
│       ├── engine/
│       ├── animations/
│       ├── layouts/
│       └── utilities/
├── assets/
│   ├── teams/
│   ├── players/
│   ├── heroes/
│   ├── sponsors/
│   └── fonts/
├── database/
│   ├── migrations/
│   └── seeds/
├── docs/
├── scripts/
├── PRD.md
├── ARCHITECTURE.md
├── DEVELOPMENT.md
├── OBS-SETUP.md
├── prompt.md
└── README.md
```

## 4. Module boundaries

Each backend module should expose:
- Route registration.
- Service/business logic.
- Repository/database access.
- Input schemas.
- Shared event publishing where required.

Do not place database logic directly in route handlers. Do not let frontend components write directly to SQLite. Keep OBS-specific logic behind an adapter/service so it can be mocked in tests.

## 5. Graphics rendering model

### Fixed logical canvas
- Logical dimensions: 1920×1080.
- Root overlay stage: fixed 1920×1080 coordinate space.
- Determine scale using `min(viewportWidth / 1920, viewportHeight / 1080)`.
- Center the stage and preserve aspect ratio.
- Keep the HTML document background transparent.
- Do not use independent width/height stretching.

### Overlay route contract
Each overlay route:
1. Loads a lightweight overlay shell.
2. Connects to Socket.IO.
3. Requests or receives the latest state snapshot.
4. Subscribes only to relevant state changes.
5. Renders the active graphic.
6. Reconnects and requests a fresh snapshot when disconnected.

Do not mount the entire operator dashboard in an overlay route. Avoid heavy dashboard-only dependencies in overlay bundles where practical.

### Graphic lifecycle
Represent visibility and animation state explicitly:
- `hidden`
- `entering`
- `visible`
- `exiting`

Use stable graphic IDs and server-issued commands. Ensure repeated show/hide commands are idempotent. A graphic should not remain stuck in an intermediate animation state after reconnect; restore its authoritative visibility state.

## 6. Realtime protocol

Backend owns authoritative match state.

Suggested envelope:

```ts
type EventEnvelope<T> = {
  eventId: string;
  matchId: string;
  revision: number;
  timestamp: string;
  payload: T;
};
```

Requirements:
- Validate client payloads with shared Zod schemas.
- Assign event IDs and revisions on the server.
- Reject stale revisions.
- Make commands idempotent where possible.
- Persist meaningful match events.
- Broadcast updates only after successful persistence.
- On reconnect, send a full state snapshot before incremental events.
- Return structured errors with stable error codes.

Do not trust client-supplied series scores. Derive series score from completed game winners.

## 7. Database and assets

Use SQLite with Drizzle migrations. Enforce foreign keys. Keep uploaded assets on disk under an application data directory, not inside the source tree for production use.

Recommended local data layout:

```text
%LOCALAPPDATA%/ArenaGraphics/
├── arena.sqlite
├── assets/
│   ├── teams/
│   ├── players/
│   ├── heroes/
│   └── sponsors/
└── logs/
```

Store relative asset identifiers/paths in the database. Validate extensions, MIME type, file size, and image dimensions. Sanitize filenames and prevent path traversal.

## 8. OBS integration

Use `obs-websocket-js` in the backend only.

- Default OBS WebSocket port: 4455.
- Require password authentication.
- Keep password in server-side environment/config storage.
- Never send password to browser clients.
- Expose a limited set of backend commands: connect, disconnect, get status, list scenes, switch scene, set source visibility.
- Handle OBS disconnects and reconnects.
- Browser Source overlays must continue rendering even if OBS WebSocket is disconnected.
- Do not assume scene or source names; allow configuration and discovery.

## 9. Security and network boundaries

Initial default bind address should be `127.0.0.1`, not `0.0.0.0`. If LAN operator access is added later:
- Require authentication or a session token.
- Restrict allowed origins.
- Protect state-changing endpoints.
- Do not expose OBS credentials.
- Validate uploads and API payloads.
- Document firewall/network requirements.

Do not expose the local server to the public internet by default.

## 10. Testing strategy

- Unit: score calculation, BO format validation, draft slot rules, schema validation, graphic state transitions.
- Integration: API/database operations, Socket.IO state propagation, reconnect snapshot.
- E2E: create tournament → teams → match → update score → verify overlay state.
- OBS: separate mocked adapter tests and real OBS smoke tests.
- Visual: verify transparent output, 1920×1080 canvas scaling, and no scrollbars.
- Performance: profile overlay rendering and animation under realistic conditions.

## 11. Build and run strategy

Provide root scripts for:
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm db:migrate`
- `pnpm db:seed`

Provide Windows PowerShell scripts for first-time setup and startup. Keep secrets and machine-specific settings out of Git.
