# Phase 2 - Match Management Implementation Plan

**Start Date:** 2026-11-01  
**Estimated Duration:** 3-4 days  
**Status:** 🚧 IN PROGRESS

---

## Objectives

Implement complete CRUD operations untuk Tournament, Team, Player, dan Match management dengan validasi BO1/BO3/BO5, game result recording, dan series score calculation.

---

## Implementation Strategy

### Stage 1: Backend API Foundation (Day 1)
1. ✅ Review existing database schema
2. [ ] Create Zod validation schemas
3. [ ] Implement Tournament CRUD endpoints
4. [ ] Implement Team CRUD endpoints
5. [ ] Implement Player CRUD endpoints
6. [ ] Implement Match CRUD endpoints
7. [ ] Test all endpoints with manual HTTP requests

### Stage 2: Business Logic (Day 2)
1. [ ] Implement BO1/BO3/BO5 validation logic
2. [ ] Implement game result recording
3. [ ] Implement series score calculation
4. [ ] Implement match state transitions
5. [ ] Add error handling and validation
6. [ ] Write unit tests for critical logic

### Stage 3: Frontend Forms (Day 3)
1. [ ] Create Tournament management page
2. [ ] Create Team management page
3. [ ] Create Player management page
4. [ ] Create Match management page
5. [ ] Implement form validation with React Hook Form
6. [ ] Add loading states and error messages

### Stage 4: Integration & Testing (Day 4)
1. [ ] Integration testing end-to-end
2. [ ] Test BO1/BO3/BO5 scenarios
3. [ ] Test series score calculation
4. [ ] Test error cases
5. [ ] Update documentation
6. [ ] Create Phase 2 completion report

---

## API Endpoints to Implement

### Tournament Endpoints
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments` - List all tournaments
- `GET /api/tournaments/:id` - Get tournament by ID
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament
- `PATCH /api/tournaments/:id/archive` - Archive tournament

### Team Endpoints
- `POST /api/teams` - Create team
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team by ID
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `GET /api/teams/:id/roster` - Get team roster

### Player Endpoints
- `POST /api/players` - Create player
- `GET /api/players` - List all players
- `GET /api/players/:id` - Get player by ID
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `GET /api/players/team/:teamId` - Get players by team

### Match Endpoints
- `POST /api/matches` - Create match
- `GET /api/matches` - List all matches
- `GET /api/matches/:id` - Get match by ID
- `PUT /api/matches/:id` - Update match
- `DELETE /api/matches/:id` - Delete match
- `GET /api/matches/tournament/:tournamentId` - Get matches by tournament
- `POST /api/matches/:id/games` - Record game result
- `GET /api/matches/:id/games` - Get match games
- `PATCH /api/matches/:id/state` - Update match state

---

## Validation Rules

### Tournament
- `name`: required, min 3 chars, max 100 chars
- `description`: optional, max 500 chars
- `startDate`: required, ISO date
- `endDate`: required, must be after startDate
- `status`: enum ['upcoming', 'active', 'completed', 'archived']

### Team
- `fullName`: required, min 3 chars, max 100 chars
- `shortName`: required, min 2 chars, max 10 chars
- `logoUrl`: optional URL
- `primaryColor`: required, hex color
- `secondaryColor`: required, hex color

### Player
- `realName`: required, min 2 chars, max 100 chars
- `nickname`: required, min 2 chars, max 50 chars
- `role`: enum ['EXP Laner', 'Jungler', 'Mid Laner', 'Gold Laner', 'Roamer']
- `photoUrl`: optional URL
- `jerseyNumber`: optional, 1-99
- `teamId`: required, must exist

### Match
- `tournamentId`: required, must exist
- `blueTeamId`: required, must exist, must differ from redTeamId
- `redTeamId`: required, must exist, must differ from blueTeamId
- `bestOf`: enum [1, 3, 5]
- `scheduledAt`: optional, ISO datetime
- `status`: enum ['scheduled', 'upcoming', 'starting-soon', 'live', 'paused', 'completed']

### Game Result
- `matchId`: required, must exist
- `gameNumber`: required, 1-5 depending on bestOf
- `winnerTeamId`: required, must be blueTeamId or redTeamId
- Validation: Cannot record more games than bestOf allows
- Validation: Cannot change result if series already decided
- Series score auto-calculated from game results

---

## Database Schema Review

From existing schema (`apps/server/src/db/schema.ts`):
- ✅ `tournaments` table exists
- ✅ `teams` table exists
- ✅ `players` table exists
- ✅ `matches` table exists
- ✅ `games` table exists
- ✅ Foreign key relationships defined
- ✅ Timestamps (createdAt, updatedAt) on all tables

---

## Technical Notes

### Series Score Calculation Logic
```typescript
// For BO1: First to 1 win
// For BO3: First to 2 wins
// For BO5: First to 3 wins

function calculateSeriesScore(games: Game[], bestOf: number) {
  const blueWins = games.filter(g => g.winnerSide === 'blue').length;
  const redWins = games.filter(g => g.winnerSide === 'red').length;
  
  const winsNeeded = Math.ceil(bestOf / 2);
  const isComplete = blueWins >= winsNeeded || redWins >= winsNeeded;
  
  return { blueWins, redWins, isComplete };
}
```

### Match State Transitions
```
scheduled → upcoming → starting-soon → live → completed
                                    ↓     ↑
                                   paused
```

### Error Handling Strategy
- Use Fastify's error handler
- Return proper HTTP status codes
- Provide clear error messages
- Validate input with Zod before DB operations
- Catch and handle DB constraint violations

---

## Acceptance Criteria

Phase 2 complete when:
- [ ] All CRUD endpoints implemented and tested
- [ ] Tournament, Team, Player, Match dapat dibuat via API
- [ ] BO1/BO3/BO5 validation berfungsi
- [ ] Game results dapat direcord
- [ ] Series score auto-calculated correctly
- [ ] Frontend forms berfungsi dengan proper validation
- [ ] Error messages clear dan helpful
- [ ] Integration testing pass
- [ ] Documentation updated

---

## Current Status

**Stage 1: Backend API Foundation** - IN PROGRESS
- Next: Review existing database schema
- Then: Create Zod validation schemas
- Then: Implement Tournament CRUD endpoints

---

*Plan created: 2026-11-01*  
*Last updated: 2026-11-01*
