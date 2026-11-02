import type { TemplateTheme } from './templates.js';

export const GRAPHIC_KEYS = [
  'scoreboard',
  'playerIntro',
  'teamIntro',
  'draft',
  'statistics',
  'mvp',
  'fullscreen',
  'objective',
] as const;


export type GraphicKey = (typeof GRAPHIC_KEYS)[number];

export const GRAPHIC_STATES = ['hidden', 'entering', 'visible', 'exiting'] as const;
export type GraphicState = (typeof GRAPHIC_STATES)[number];

export type OverlayState = Record<GraphicKey, { visible: boolean }>;

export const DRAFT_FORMATS = {
  standard: { bansPerSide: 5, picksPerSide: 5, label: 'Standard · 5 ban / 5 pick' },
  quick: { bansPerSide: 3, picksPerSide: 5, label: 'Quick · 3 ban / 5 pick' },
} as const;

export type DraftFormatKey = keyof typeof DRAFT_FORMATS;

export const FULLSCREEN_MODES = ['starting-soon', 'break', 'result'] as const;
export type FullscreenMode = (typeof FULLSCREEN_MODES)[number];

/** Objectives that can fire an on-air alert banner. */
export const OBJECTIVE_TYPES = ['first-blood', 'turtle', 'lord'] as const;
export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number];

/** Short operator-facing names, used by the dashboard controls. */
export const OBJECTIVE_LABELS: Record<ObjectiveType, string> = {
  'first-blood': 'First Blood',
  turtle: 'Turtle',
  lord: 'Lord',
};

/** Default banner headline; the operator may override it per trigger. */
export const OBJECTIVE_TITLES: Record<ObjectiveType, string> = {
  'first-blood': 'FIRST BLOOD',
  turtle: 'TURTLE SLAIN',
  lord: 'LORD SLAIN',
};

/** Milliseconds an objective banner stays on air before auto-hiding (0 = manual). */
export const OBJECTIVE_DEFAULT_DURATION_MS = 5000;

export interface TeamSummary {
  id: number;
  name: string;
  shortName: string;
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface PlayerSummary {
  id: number;
  nickname: string;
  realName: string;
  role: string;
  jerseyNumber: number | null;
  photoPath: string | null;
}

export interface ScoreboardData {
  matchId: number;
  tournamentId: number;
  tournamentName: string;
  format: string;
  status: string;
  gameNumber: number;
  blue: TeamSummary;
  red: TeamSummary;
  blueWins: number;
  redWins: number;
}

export interface TeamIntroData {
  team: TeamSummary;
  players: PlayerSummary[];
}

export interface PlayerIntroData {
  team: TeamSummary;
  player: PlayerSummary | null;
  players: PlayerSummary[];
  index: number;
}

export interface DraftSlotData {
  side: 'blue' | 'red';
  actionType: 'ban' | 'pick';
  slotNumber: number;
  heroId: number | null;
  heroName: string | null;
  portraitPath: string | null;
}

export interface DraftState {
  matchId: number;
  gameNumber: number;
  format: DraftFormatKey;
  slots: DraftSlotData[];
}

export interface TeamStatistics {
  kills: number;
  turrets: number;
  turtles: number;
  lords: number;
  gold: number;
}

export interface StatisticsData {
  blue: TeamStatistics;
  red: TeamStatistics;
  durationSeconds: number | null;
  label: string;
}

export interface MvpData {
  playerId: number | null;
  nickname: string;
  realName: string;
  role: string;
  teamName: string;
  heroId: number | null;
  heroName: string;
  kills: number;
  deaths: number;
  assists: number;
}

export interface FullscreenData {
  mode: FullscreenMode;
  title: string;
  subtitle: string;
}

export interface ObjectiveAlertData {
  type: ObjectiveType;
  /** Which side secured the objective; null for a neutral alert. */
  side: 'blue' | 'red' | null;
  /** Team that secured it (resolved from the scoreboard), if a side was given. */
  team: TeamSummary | null;
  /** Banner headline, e.g. "LORD SLAIN". */
  title: string;
  /** Secondary line, e.g. the team name. */
  subtitle: string;
  /**
   * Increments on every trigger so the overlay replays its entrance animation
   * even when the banner is already on air.
   */
  nonce: number;
}

export interface OverlayData {
  scoreboard: ScoreboardData | null;
  playerIntro: PlayerIntroData | null;
  teamIntro: TeamIntroData | null;
  draft: DraftState | null;
  statistics: StatisticsData | null;
  mvp: MvpData | null;
  fullscreen: FullscreenData | null;
  objective: ObjectiveAlertData | null;
}

export interface MatchStatePayload {
  status: 'idle' | 'active';
  selectedTournamentId: string | null;
  selectedMatchId: string | null;
  currentGame: number | null;
  seriesScore: { blue: number; red: number };
  overlay: OverlayState;
  data: OverlayData;
  /**
   * Active theme per graphic, resolved from saved templates. Overlays apply the
   * matching theme so operator template edits appear on air. Missing keys fall
   * back to the built-in default theme.
   */
  themes?: Partial<Record<GraphicKey, TemplateTheme>>;
}

export interface MatchState {
  matchId: string;
  revision: number;
  timestamp: string;
  payload: MatchStatePayload;
}

export interface DraftSlotCommand {
  side: 'blue' | 'red';
  actionType: 'ban' | 'pick';
  slotNumber: number;
  heroId: number | null;
}

export interface DraftFormatCommand {
  format: DraftFormatKey;
}

export interface StatisticsCommand {
  blue: TeamStatistics;
  red: TeamStatistics;
  durationSeconds?: number | null;
  label?: string;
}

export interface MvpCommand {
  playerId: number;
  heroId: number | null;
  kills: number;
  deaths: number;
  assists: number;
}

export interface ObjectiveAlertCommand {
  type: ObjectiveType;
  /** Team that secured the objective; omit for a neutral alert. */
  side: 'blue' | 'red' | null;
  /** Optional overrides for the auto-generated banner copy. */
  title?: string;
  subtitle?: string;
  /** Auto-hide delay in ms; 0 keeps the banner on air until hidden. */
  durationMs?: number;
}

export type ClientToServerEvents = {
  'state:request': () => void;
  'match:select': (payload: { matchId: number }) => void;
  'graphic:set': (payload: { key: GraphicKey; visible: boolean }) => void;
  'graphic:reset': () => void;
  'player-intro:step': (payload: { index: number }) => void;
  'team-intro:load': (payload: { side: 'blue' | 'red' }) => void;
  'draft:set': (payload: DraftSlotCommand) => void;
  'draft:format': (payload: DraftFormatCommand) => void;
  'draft:reset': () => void;
  'statistics:set': (payload: StatisticsCommand) => void;
  'statistics:reset': () => void;
  'mvp:set': (payload: MvpCommand) => void;
  'fullscreen:set': (payload: FullscreenData) => void;
  'objective:alert': (payload: ObjectiveAlertCommand) => void;
  'objective:hide': () => void;
  'system:ping': () => void;
};

export type ServerToClientEvents = {
  'state:initial': (state: MatchState) => void;
  'state:update': (state: MatchState) => void;
  'system:pong': (latencyMs: number) => void;
  'system:error': (payload: { message: string }) => void;
};