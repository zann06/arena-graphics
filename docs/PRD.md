# ARENA GRAPHICS
## Product Requirements Document

**Product:** ARENA GRAPHICS — MLBB Broadcast Graphics Engine  
**Version:** 1.0.0  
**Status:** Ready for Development  
**Platform:** Windows 10/11, local web application  
**Target:** Mobile Legends: Bang Bang tournaments  
**Canvas:** 1920 × 1080, 16:9  
**Architecture:** Modular monolith, local-first

---

## 1. Product overview

ARENA GRAPHICS is a local-first web application for creating, controlling, and rendering esports broadcast graphics for Mobile Legends: Bang Bang. Operators manage tournament data and trigger graphics from a dashboard. Graphics are rendered dynamically in browser-based overlay routes and displayed in OBS Studio through Browser Source.

The application must not depend on pre-existing OBS graphics assets. Logos, player photos, hero portraits, sponsor marks, and fonts are imported into a local asset library; layouts, text, panels, transitions, and animations are rendered by the application.

### Product vision
Provide a reusable and reliable broadcast graphics platform that can be operated by a small esports production team during live tournaments.

### Core principles
1. Design once, control dynamically.
2. Realtime updates with reliable state synchronization.
3. Operator-first workflows and clear safety controls.
4. Separate dashboard UI from broadcast output.
5. Local-first operation without paid API dependencies.
6. Reusable templates and original visual identity.
7. OBS Browser Source rendering must work independently of OBS WebSocket.

## 2. Goals and non-goals

### Goals
- Manage tournaments, teams, players, matches, and game results.
- Render original, professional MPL-inspired graphics at 1920×1080.
- Update overlays from an operator dashboard in realtime.
- Provide dedicated overlay URLs for OBS Browser Source.
- Support manual MLBB draft, statistics, and MVP entry.
- Persist match data and recover overlay state after reconnect.
- Optionally control OBS scenes and source visibility through OBS WebSocket.

### Non-goals for MVP
- Automatic MLBB telemetry, kill detection, gold detection, or game-client integration.
- Scraping or depending on unofficial game APIs.
- Cloud SaaS, public multi-tenant hosting, or cloud synchronization.
- Full freeform vector-design editor.
- Automated player/statistics recognition.

## 3. Users and roles

- **Broadcast Operator:** controls live graphics and match state.
- **Tournament Admin:** manages tournaments, teams, rosters, and fixtures.
- **Graphics Designer:** configures templates, colors, typography, and assets.
- **Broadcast Director:** coordinates which graphics are on air.

Initial MVP may use one local operator without a full permissions system. Design data models so roles can be added later.

## 4. Technical baseline

| Area | Technology |
|---|---|
| Language | TypeScript |
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui where useful |
| Dashboard state | Zustand |
| Animation | Framer Motion |
| Backend | Node.js + Fastify |
| Realtime | Socket.IO |
| Database | SQLite + Drizzle ORM |
| Validation | Zod |
| OBS integration | obs-websocket-js |
| Tests | Vitest + Playwright |
| Workspace | pnpm |

Use compatible, stable package versions. Avoid adding dependencies without a clear need.

## 5. Functional requirements

### FR-01 — Dashboard
- Show selected tournament and active match.
- Show current game, series score, match status, and OBS connection status.
- Provide shortcuts to Match Center and Graphics Control.
- Show recent operator actions and connection errors.

### FR-02 — Tournament management
- Create, edit, list, and archive tournaments.
- Store name, description, logo, primary color, secondary color, and dates.
- Associate teams and matches with a tournament.

### FR-03 — Team management
- Create and edit teams.
- Store full name, short name, logo, primary/secondary colors.
- Manage roster membership.

### FR-04 — Player management
- Store real name, nickname, photo, role, team, and optional jersey number.
- Supported roles: EXP Laner, Jungler, Mid Laner, Gold Laner, Roamer.
- Select five starting players for a game or introduction sequence.

### FR-05 — Match management
- Create matches between two teams.
- Support BO1, BO3, and BO5.
- Track scheduled, upcoming, starting-soon, live, paused, and completed states.
- Track current game and blue/red side assignments.
- Store each game's winner; derive series score from completed game results.
- Prevent impossible or inconsistent winner assignment.

### FR-06 — Scoreboard overlay
- Display team names, logos, series scores, game number, BO format, and optional sponsor.
- Provide safe score/result controls in Match Center.
- Derive series score from game results rather than maintaining unrelated duplicate values.
- Support show, hide, preview, entrance, and exit actions.

### FR-07 — Player and team introduction
- Show team branding and player photo, nickname, real name, and role.
- Support individual player reveal and team lineup presentation.
- Provide entrance and exit animation.
- Allow operator preview before taking a graphic live.

### FR-08 — Draft pick and ban
- Provide blue-side and red-side team panels.
- Support configurable ban and pick slots for the tournament's selected draft format.
- Display hero portrait, hero name, slot, and pick/ban status.
- Allow manual hero selection, correction, reset, and confirmation.
- Store hero assets locally; do not rely on unofficial MLBB APIs.
- Keep draft slot configuration data-driven to allow format changes.

### FR-09 — Game statistics
- Manually enter kills, turrets, turtles, Lords, gold difference, and duration.
- Provide increment/decrement and direct correction controls.
- Validate values and record changes.
- Clearly label statistics as operator-entered.

### FR-10 — MVP and match results
- Select MVP player and optional hero.
- Store manually entered KDA.
- Show winner, final series score, player, hero, and result animation.

### FR-11 — Graphics control
- Control scoreboard, player intro, team intro, draft, statistics, MVP, Starting Soon, Break Time, Match Result, Victory, sponsor banner, and lower third.
- Each graphic supports preview, show, hide, entrance, exit, and active status.
- Provide clear ON AIR indication and confirmation for disruptive actions.

### FR-12 — Asset library
- Import and manage team logos, player photos, hero portraits, sponsor logos, and fonts.
- Validate file type and reasonable file size.
- Store assets locally and reference them by stable IDs.
- Allow replacement without breaking references.
- Do not bundle copyrighted game assets without the user's authorization; provide an import workflow and optional placeholders.

### FR-13 — Template Studio
- MVP supports predefined templates with editable colors, text styles, asset references, and layout properties.
- Allow save, duplicate, preview, and restore defaults.
- A full freeform drag-and-drop editor is future scope.

### FR-14 — OBS integration
- Provide dedicated transparent overlay routes.
- Optionally connect to OBS WebSocket with password authentication.
- Read scene list and control scene switching/source visibility.
- Show connection status and reconnect after disconnect.
- Browser Source rendering must remain functional without WebSocket connection.
- Never expose OBS credentials to frontend clients or URLs.

## 6. Overlay routes

Implement independent routes:
- `/overlay/scoreboard`
- `/overlay/player-intro`
- `/overlay/team-intro`
- `/overlay/draft`
- `/overlay/statistics`
- `/overlay/mvp`
- `/overlay/fullscreen`

All overlays:
- Use transparent page background.
- Render in a fixed logical 1920×1080 canvas.
- Scale proportionally to the Browser Source viewport; do not stretch elements independently.
- Have no page margins, scrollbars, or dashboard navigation.
- Receive state from backend and recover after reconnect.
- Avoid full-page reload for normal data updates.

## 7. Visual direction

Create an original professional esports identity inspired by the production quality and information hierarchy of top-tier MLBB broadcasts. Do not copy MPL trademarks, proprietary artwork, exact layouts, or branding.

Suggested palette:
- Navy: `#0B1020`
- Deep surface: `#111C35`
- Blue: `#237BFF`
- Cyan: `#00D9FF`
- Red: `#F04452`
- Background: `#080D19`
- Surface: `#182238`
- Primary text: `#FFFFFF`
- Secondary text: `#AAB5C8`
- Success: `#20C997`

Use strong condensed display typography for scores and headings, readable sans-serif typography for labels, angular accents, restrained gradients, and purposeful motion. Dashboard and broadcast graphics must be visually distinct. Do not overuse glow or decoration.

## 8. Realtime and state rules

- Backend is the authoritative source of match state.
- Every mutation is validated server-side.
- Include event ID, match ID, timestamp, and monotonically increasing revision.
- Reject stale revisions and protect against duplicate actions.
- Overlay reconnect requests the latest authoritative snapshot.
- Persist important match changes and operator events.
- Prefer explicit commands over ambiguous client-side state mutation.
- Do not allow two simultaneous updates to silently overwrite one another.

Suggested events:
- Client → server: `match:select`, `match:update`, `score:update`, `game:update`, `draft:update`, `player:intro`, `graphics:show`, `graphics:hide`, `statistics:update`.
- Server → client: `state:initial`, `match:updated`, `score:updated`, `draft:updated`, `graphics:updated`, `connection:status`, `error:occurred`.

## 9. Data model

Minimum entities:
- `tournaments`: id, name, description, logoPath, primaryColor, secondaryColor, createdAt, updatedAt.
- `teams`: id, tournamentId, name, shortName, logoPath, primaryColor, secondaryColor.
- `players`: id, teamId, realName, nickname, photoPath, role, jerseyNumber.
- `matches`: id, tournamentId, teamAId, teamBId, format, status, currentGame, scheduledAt, winnerTeamId.
- `games`: id, matchId, gameNumber, winnerTeamId, blueTeamId, redTeamId, durationSeconds, status.
- `heroes`: id, name, portraitPath, assetVersion.
- `draftSlots`: id, gameId, teamId, phase, slotNumber, heroId, actionType.
- `gameStatistics`: id, gameId, teamId, kills, turrets, turtles, lords, goldDifference.
- `mvpRecords`: id, matchId, gameId, playerId, heroId, kills, deaths, assists.
- `graphicsTemplates`: id, name, templateType, configurationJson, createdAt, updatedAt.
- `matchEvents`: id, matchId, eventType, payloadJson, createdAt.

Use foreign keys, indexes, migrations, and typed database access. Store image files on disk, not as large blobs in SQLite.

## 10. API outline

- `GET /api/health`
- `GET/POST /api/tournaments`
- `GET/POST /api/teams`
- `GET/POST /api/players`
- `GET/POST /api/matches`
- `GET/PUT /api/matches/:id`
- `GET/POST /api/matches/:id/games`
- `PUT /api/games/:id/statistics`
- `PUT /api/games/:id/draft`
- `POST /api/matches/:id/results`
- `POST /api/matches/:id/mvp`
- `GET/POST /api/graphics/templates`
- `PUT /api/graphics/templates/:id`
- `POST /api/assets/upload`
- `GET /api/obs/status`
- `POST /api/obs/connect`
- `POST /api/obs/disconnect`

Use Zod schemas for all request payloads and return consistent error shapes. Add authentication or local-network access restrictions before exposing the server beyond localhost.

## 11. Performance and compatibility

- Windows 10/11.
- Modern Chromium-based browser and OBS Studio.
- 8 GB RAM minimum recommended; 16 GB preferred.
- Target 60 FPS for animations on a typical production laptop.
- Target local update propagation under 200 ms under normal conditions.
- Target initial overlay render under 2 seconds on a typical local setup.
- Support at least three connected clients in initial architecture.
- Measure performance; do not claim targets are met without testing.

## 12. Acceptance criteria

MVP is accepted when:
1. A tournament can be created.
2. Two teams and their players can be registered.
3. BO1/BO3/BO5 matches can be created.
4. Match Center can control current game and results.
5. Scoreboard updates appear in a running OBS Browser Source.
6. Player introduction can be triggered.
7. Draft graphics can be updated manually.
8. Statistics and MVP can be entered and displayed.
9. Overlay background is transparent at 1920×1080.
10. Overlay reconnect restores latest state.
11. Match results persist in SQLite.
12. Core functionality works without paid APIs.
13. Tests and production build pass.
14. OBS WebSocket features are tested against a real OBS instance before being marked verified.

## 13. Development phases

1. Foundation: workspace, frontend, backend, database, shared types, dashboard shell.
2. Match management: tournament, team, player, match, game result logic.
3. Graphics engine: overlay framework, scoreboard, intro, fullscreen graphics.
4. MLBB modules: draft, hero library, statistics, MVP.
5. OBS: Browser Source verification, WebSocket integration, scene/source controls.
6. Template Studio: branding, colors, asset management, template persistence.
7. QA and release: unit, integration, E2E, performance, documentation.

## 14. Definition of done

A feature is complete only when implementation, validation, relevant tests, and documentation are complete. Distinguish mocked integration tests from real OBS verification. Never mark an untested feature as complete.
