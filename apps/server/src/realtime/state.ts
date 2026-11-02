import type { Server } from 'socket.io';
import {
  DRAFT_FORMATS,
  emptyStatisticsData,
  loadDraft,
  loadHero,
  loadMvp,
  loadRoster,
  loadScoreboard,
  loadStatistics,
  resetDraftSlots,
  saveDraftSlot,
  saveMvp,
  saveStatistics,
  type DraftFormatKey,
} from '../services/mlbb.js';
import {
  GRAPHIC_KEYS,
  OBJECTIVE_DEFAULT_DURATION_MS,
  OBJECTIVE_TITLES,
  type DraftFormatCommand,
  type DraftSlotCommand,
  type FullscreenData,
  type GraphicKey,
  type MatchState,
  type MvpCommand,
  type ObjectiveAlertCommand,
  type OverlayState,
  type StatisticsCommand,
} from '@arena/shared/types/realtime.js';
import { activeThemeMap } from '../services/templates.js';

function emptyOverlay(): OverlayState {
  return GRAPHIC_KEYS.reduce((acc, key) => {
    acc[key] = { visible: false };
    return acc;
  }, {} as OverlayState);
}

const DEFAULT_FULLSCREEN: FullscreenData = {
  mode: 'starting-soon',
  title: 'STARTING SOON',
  subtitle: 'Match begins shortly',
};

function createInitialState(): MatchState {
  return {
    matchId: '',
    revision: 1,
    timestamp: new Date().toISOString(),
    payload: {
      status: 'idle',
      selectedTournamentId: null,
      selectedMatchId: null,
      currentGame: null,
      seriesScore: { blue: 0, red: 0 },
      overlay: emptyOverlay(),
      data: {
        scoreboard: null,
        playerIntro: null,
        teamIntro: null,
        draft: null,
        statistics: null,
        mvp: null,
        fullscreen: DEFAULT_FULLSCREEN,
        objective: null,
      },
    },
  };
}

const state: MatchState = createInitialState();
let io: Server | null = null;

export function setRealtimeServer(server: Server): void {
  io = server;
}

export function getLiveState(): MatchState {
  return state;
}

function touch(): void {
  state.revision += 1;
  state.timestamp = new Date().toISOString();
}

export function broadcastState(): void {
  io?.emit('state:update', state);
}

function currentMatchId(): number | null {
  return state.payload.selectedMatchId ? Number(state.payload.selectedMatchId) : null;
}

function currentGameNumber(): number | null {
  return state.payload.currentGame ?? state.payload.data.scoreboard?.gameNumber ?? null;
}

/**
 * Reload the match-scoped data (draft, statistics, MVP) for the active game so
 * the overlay shows exactly what is persisted, even after a reconnect.
 */
async function loadGameData(matchId: number, gameNumber: number): Promise<void> {
  const format = state.payload.data.draft?.format ?? 'standard';
  const [draft, statistics, mvp] = await Promise.all([
    loadDraft(matchId, gameNumber, format),
    loadStatistics(matchId, gameNumber),
    loadMvp(matchId, gameNumber),
  ]);
  state.payload.data.draft = draft;
  state.payload.data.statistics = statistics;
  state.payload.data.mvp = mvp;
}

export async function selectMatch(matchId: number): Promise<void> {
  const snapshot = await loadScoreboard(matchId);
  if (!snapshot) {
    throw new Error('Match not found');
  }

  state.matchId = String(matchId);
  state.payload.status = 'active';
  state.payload.selectedMatchId = String(matchId);
  state.payload.selectedTournamentId = String(snapshot.tournamentId);
  state.payload.currentGame = snapshot.gameNumber;
  state.payload.seriesScore = { blue: snapshot.blueWins, red: snapshot.redWins };
  state.payload.data.scoreboard = snapshot;

  const [blueRoster, redRoster] = await Promise.all([
    loadRoster(snapshot.blue.id),
    loadRoster(snapshot.red.id),
  ]);

  state.payload.data.teamIntro = { team: snapshot.blue, players: blueRoster };
  state.payload.data.playerIntro = {
    team: snapshot.blue,
    player: blueRoster[0] ?? null,
    players: blueRoster,
    index: 0,
  };
  // Roster lookup for red is kept so switching sides does not need a round trip.
  redRosterCache = redRoster;

  await loadGameData(matchId, snapshot.gameNumber);
  if (!state.payload.data.statistics) {
    state.payload.data.statistics = emptyStatisticsData();
  }

  touch();
  broadcastState();
}

let redRosterCache: Awaited<ReturnType<typeof loadRoster>> = [];

export async function refreshSelectedMatch(): Promise<void> {
  const matchId = currentMatchId();
  if (!matchId) return;
  const snapshot = await loadScoreboard(matchId);
  if (!snapshot) return;
  const gameChanged = state.payload.currentGame !== snapshot.gameNumber;
  state.payload.data.scoreboard = snapshot;
  state.payload.seriesScore = { blue: snapshot.blueWins, red: snapshot.redWins };
  state.payload.currentGame = snapshot.gameNumber;
  if (gameChanged) {
    // A new game started: draft/statistics/MVP belong to the new game.
    await loadGameData(matchId, snapshot.gameNumber);
  }
  touch();
  broadcastState();
}

export function setGraphicVisible(key: GraphicKey, visible: boolean): void {
  if (!(key in state.payload.overlay)) return;
  if (key === 'objective' && !visible) clearObjectiveTimer();
  state.payload.overlay[key].visible = visible;
  touch();
  broadcastState();
}

export function resetGraphics(): void {
  clearObjectiveTimer();
  state.payload.overlay = emptyOverlay();
  touch();
  broadcastState();
}

export function stepPlayerIntro(index: number): void {
  const intro = state.payload.data.playerIntro;
  if (!intro) return;
  const clamped = Math.max(0, Math.min(index, intro.players.length - 1));
  intro.index = clamped;
  intro.player = intro.players[clamped] ?? null;
  touch();
  broadcastState();
}

export async function loadTeamIntro(side: 'blue' | 'red'): Promise<void> {
  const scoreboard = state.payload.data.scoreboard;
  if (!scoreboard) throw new Error('Select a match first');
  const team = side === 'blue' ? scoreboard.blue : scoreboard.red;
  const roster = side === 'blue' ? await loadRoster(team.id) : redRosterCache.length > 0 ? redRosterCache : await loadRoster(team.id);
  redRosterCache = roster;
  state.payload.data.teamIntro = { team, players: roster };
  state.payload.data.playerIntro = {
    team,
    player: roster[0] ?? null,
    players: roster,
    index: 0,
  };
  touch();
  broadcastState();
}

export async function setDraftSlot(command: DraftSlotCommand): Promise<void> {
  const matchId = currentMatchId();
  const gameNumber = currentGameNumber();
  if (!matchId || !gameNumber) throw new Error('Select a match first');
  if (!state.payload.data.draft) {
    state.payload.data.draft = await loadDraft(matchId, gameNumber, 'standard');
  }

  await saveDraftSlot({ ...command, matchId, gameNumber });

  const slot = state.payload.data.draft.slots.find(
    (s) => s.side === command.side && s.actionType === command.actionType && s.slotNumber === command.slotNumber
  );
  if (slot) {
    const hero = command.heroId != null ? (await loadHero(command.heroId)) : null;
    slot.heroId = command.heroId;
    slot.heroName = hero?.name ?? null;
    slot.portraitPath = hero?.portraitPath ?? null;
  }
  touch();
  broadcastState();
}

export async function setDraftFormat(command: DraftFormatCommand): Promise<void> {
  const matchId = currentMatchId();
  const gameNumber = currentGameNumber();
  if (!matchId || !gameNumber) throw new Error('Select a match first');
  const format: DraftFormatKey = DRAFT_FORMATS[command.format] ? command.format : 'standard';
  state.payload.data.draft = await loadDraft(matchId, gameNumber, format);
  touch();
  broadcastState();
}

export async function resetDraft(): Promise<void> {
  const matchId = currentMatchId();
  const gameNumber = currentGameNumber();
  if (!matchId || !gameNumber) throw new Error('Select a match first');
  await resetDraftSlots(matchId, gameNumber);
  state.payload.data.draft = await loadDraft(matchId, gameNumber, state.payload.data.draft?.format ?? 'standard');
  touch();
  broadcastState();
}

export async function setStatistics(command: StatisticsCommand): Promise<void> {
  const matchId = currentMatchId();
  const gameNumber = currentGameNumber();
  if (!matchId || !gameNumber) throw new Error('Select a match first');
  state.payload.data.statistics = await saveStatistics({
    matchId,
    gameNumber,
    blue: command.blue,
    red: command.red,
    durationSeconds: command.durationSeconds ?? null,
  });
  touch();
  broadcastState();
}

export function resetStatistics(): void {
  state.payload.data.statistics = emptyStatisticsData();
  touch();
  broadcastState();
}

export async function setMvp(command: MvpCommand): Promise<void> {
  const matchId = currentMatchId();
  const gameNumber = currentGameNumber();
  if (!matchId || !gameNumber) throw new Error('Select a match first');
  state.payload.data.mvp = await saveMvp({ ...command, matchId, gameNumber });
  touch();
  broadcastState();
}

export function setFullscreen(payload: FullscreenData): void {
  state.payload.data.fullscreen = payload;
  touch();
  broadcastState();
}

let objectiveTimer: ReturnType<typeof setTimeout> | null = null;

function clearObjectiveTimer(): void {
  if (objectiveTimer) {
    clearTimeout(objectiveTimer);
    objectiveTimer = null;
  }
}

/**
 * Fire an objective alert banner (First Blood / Turtle / Lord). The team is
 * resolved from the currently selected match so the banner picks up the right
 * colors and name; the operator may override the copy. The banner auto-hides
 * after `durationMs` (default ~5s) unless the operator keeps it on air.
 */
export function showObjective(command: ObjectiveAlertCommand): void {
  clearObjectiveTimer();

  const scoreboard = state.payload.data.scoreboard;
  const team =
    command.side && scoreboard ? (command.side === 'blue' ? scoreboard.blue : scoreboard.red) : null;

  state.payload.data.objective = {
    type: command.type,
    side: command.side,
    team,
    title: command.title?.trim() || OBJECTIVE_TITLES[command.type],
    subtitle: command.subtitle?.trim() || team?.name || 'Objective secured',
    nonce: (state.payload.data.objective?.nonce ?? 0) + 1,
  };
  state.payload.overlay.objective.visible = true;
  touch();
  broadcastState();

  const duration = command.durationMs ?? OBJECTIVE_DEFAULT_DURATION_MS;
  if (duration > 0) {
    objectiveTimer = setTimeout(() => {
      objectiveTimer = null;
      hideObjective();
    }, duration);
  }
}

export function hideObjective(): void {
  clearObjectiveTimer();
  if (!state.payload.overlay.objective.visible) return;
  state.payload.overlay.objective.visible = false;
  touch();
  broadcastState();
}

/**
 * Reload the active template themes into the live payload and broadcast, so
 * overlay edits (colors, fonts, layout) appear immediately on air.
 */
export async function reloadThemes(): Promise<void> {
  state.payload.themes = await activeThemeMap();
  touch();
  broadcastState();
}
