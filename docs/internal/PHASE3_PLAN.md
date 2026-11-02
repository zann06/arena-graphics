# Phase 2 Frontend — Management UI Implementation Plan

> **Naming note:** This plan is the frontend completion of Phase 2 (Match management) in `DEVELOPMENT.md`.
> The next roadmap phase is **Phase 3 — Graphics engine**. Delivery report: `PHASE2_UI_REPORT.md`.

**Start Date:** 2026-11-01  
**Estimated Duration:** 2-3 days  
**Status:** ✅ COMPLETED (core scope)

---

## Objectives

Implement frontend management pages untuk Tournament, Team, Player, dan Match dengan forms, data tables, validation, dan API integration.

---

## Implementation Strategy

### Stage 1: API Client & State Management (Day 1 - Part 1)
1. [ ] Create API client with fetch/axios
2. [ ] Setup React Query for data fetching
3. [ ] Create API hooks for all endpoints
4. [ ] Setup Zustand store for global state
5. [ ] Create toast notification system

### Stage 2: Tournament Management (Day 1 - Part 2)
1. [ ] Create Tournament list page with data table
2. [ ] Create Tournament create/edit form
3. [ ] Implement form validation with React Hook Form + Zod
4. [ ] Add delete confirmation dialog
5. [ ] Test CRUD operations end-to-end

### Stage 3: Team Management (Day 2 - Part 1)
1. [ ] Create Team list page with data table
2. [ ] Create Team create/edit form
3. [ ] Add team roster view
4. [ ] Implement color picker for team colors
5. [ ] Test CRUD operations end-to-end

### Stage 4: Player Management (Day 2 - Part 2)
1. [ ] Create Player list page with data table
2. [ ] Create Player create/edit form
3. [ ] Add team filter dropdown
4. [ ] Add role selector
5. [ ] Test CRUD operations end-to-end

### Stage 5: Match Management (Day 3)
1. [ ] Create Match list page with data table
2. [ ] Create Match create/edit form
3. [ ] Add game result recording interface
4. [ ] Display series score
5. [ ] Show match status and winner
6. [ ] Test match flow: create → record games → completion

### Stage 6: Polish & Integration (Day 3 - End)
1. [ ] Add loading states everywhere
2. [ ] Improve error messages
3. [ ] Add empty states
4. [ ] Responsive design check
5. [ ] End-to-end integration testing
6. [ ] Update documentation

---

## Technical Stack

### UI Components
- **React** - Frontend framework
- **React Router** - Routing
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Forms & Validation
- **React Hook Form** - Form management
- **Zod** - Runtime validation (reuse backend schemas)
- **@hookform/resolvers** - Zod integration

### Data Fetching
- **TanStack Query (React Query)** - Data fetching & caching
- **Axios** - HTTP client

### State Management
- **Zustand** - Global state (if needed)
- **React Context** - Simpler state sharing

### Notifications
- **Sonner** - Toast notifications

---

## Pages to Create

### 1. Tournament Management (`/dashboard/tournaments`)
**Features:**
- Data table with columns: Name, Description, Colors, Actions
- Create button → Opens create form modal
- Edit button per row → Opens edit form modal
- Delete button per row → Opens confirmation dialog
- View matches button → Navigate to matches filtered by tournament

**Form Fields:**
- Name (required, 3-100 chars)
- Description (optional, max 500 chars)
- Logo path (optional)
- Primary color (color picker, default #237bff)
- Secondary color (color picker, default #00d9ff)

### 2. Team Management (`/dashboard/teams`)
**Features:**
- Data table with columns: Name, Short Name, Tournament, Colors, Roster Size, Actions
- Create button → Opens create form modal
- Edit button → Opens edit form modal
- Delete button → Confirmation dialog
- View roster button → Shows players in team

**Form Fields:**
- Tournament (dropdown, required)
- Name (required, 3-100 chars)
- Short name (required, 2-10 chars)
- Logo path (optional)
- Primary color (color picker)
- Secondary color (color picker)

### 3. Player Management (`/dashboard/players`)
**Features:**
- Data table with columns: Nickname, Real Name, Team, Role, Jersey #, Actions
- Filter by team dropdown
- Create button → Opens create form modal
- Edit button → Opens edit form modal
- Delete button → Confirmation dialog

**Form Fields:**
- Team (dropdown, required)
- Real name (required, 2-100 chars)
- Nickname (required, 2-50 chars)
- Role (dropdown: EXP Laner, Jungler, Mid Laner, Gold Laner, Roamer)
- Jersey number (optional, 1-99)
- Photo path (optional)

### 4. Match Management (`/dashboard/matches`)
**Features:**
- Data table with columns: Tournament, Team A, Team B, Format, Status, Score, Winner, Actions
- Create button → Opens create form modal
- Edit button → Opens edit form modal
- Delete button → Confirmation dialog
- Record game button → Opens game result modal
- View games button → Shows all games in match

**Form Fields (Match):**
- Tournament (dropdown, required)
- Team A (dropdown, required)
- Team B (dropdown, required, filtered to exclude Team A)
- Format (radio: BO1, BO3, BO5)
- Status (dropdown: scheduled, upcoming, starting-soon, live, paused, completed)
- Scheduled at (datetime picker, optional)

**Form Fields (Game Result):**
- Game number (auto-calculated or manual)
- Blue team (dropdown: Team A or Team B)
- Red team (dropdown: Team A or Team B, auto-exclude blue team)
- Winner (dropdown: Blue team or Red team)
- Duration (optional, in seconds or MM:SS format)

**Display:**
- Current series score (e.g., "RRQ 2 - 1 ONIC")
- Match status badge
- Winner team if completed

---

## Component Structure

```
apps/web/src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── ...
│   ├── tournaments/
│   │   ├── TournamentList.tsx
│   │   ├── TournamentForm.tsx
│   │   └── TournamentDeleteDialog.tsx
│   ├── teams/
│   │   ├── TeamList.tsx
│   │   ├── TeamForm.tsx
│   │   ├── TeamRoster.tsx
│   │   └── TeamDeleteDialog.tsx
│   ├── players/
│   │   ├── PlayerList.tsx
│   │   ├── PlayerForm.tsx
│   │   └── PlayerDeleteDialog.tsx
│   └── matches/
│       ├── MatchList.tsx
│       ├── MatchForm.tsx
│       ├── GameResultForm.tsx
│       ├── MatchGames.tsx
│       └── MatchDeleteDialog.tsx
├── hooks/
│   ├── api/
│   │   ├── useTournaments.ts
│   │   ├── useTeams.ts
│   │   ├── usePlayers.ts
│   │   └── useMatches.ts
│   └── useToast.ts
├── lib/
│   ├── api-client.ts         # Axios instance
│   ├── query-client.ts       # React Query config
│   └── utils.ts
└── pages/
    └── dashboard/
        ├── tournaments.tsx
        ├── teams.tsx
        ├── players.tsx
        └── matches.tsx
```

---

## API Client Design

```typescript
// lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptors for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    return Promise.reject(error);
  }
);
```

---

## React Query Hooks Pattern

```typescript
// hooks/api/useTournaments.ts
export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: () => apiClient.get('/tournaments').then(res => res.data),
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/tournaments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create tournament');
    },
  });
}
```

---

## Acceptance Criteria

Phase 3 complete when:
- [ ] All management pages accessible from dashboard
- [ ] All CRUD operations work from UI
- [ ] Forms validate properly with clear error messages
- [ ] Delete confirmations prevent accidental deletions
- [ ] Loading states show during API calls
- [ ] Success/error toasts display appropriately
- [ ] Empty states guide users when no data
- [ ] Series score displays correctly on match page
- [ ] Game result recording updates series score in real-time
- [ ] Responsive design works on different screen sizes
- [ ] No console errors or warnings

---

## Current Status

**Stage 1: API Client & State Management** - STARTING NOW
- Next: Install required dependencies
- Then: Create API client
- Then: Setup React Query

---

*Plan created: 2026-11-01 15:34*  
*Last updated: 2026-11-01 15:34*
