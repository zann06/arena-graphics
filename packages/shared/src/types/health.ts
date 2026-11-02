export interface HealthCapabilities {
  database: boolean;
  realtime: boolean;
  tournament: boolean;
  team: boolean;
  player: boolean;
  match: boolean;
  scoreboard: boolean;
  playerIntro: boolean;
  teamIntro: boolean;
  draft: boolean;
  statistics: boolean;
  mvp: boolean;
  overlay: boolean;
  obs: boolean;
  assetUpload: boolean;
  templateStudio: boolean;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected' | 'unknown';
    realtime: 'ready' | 'connecting' | 'disconnected';
    obs?: {
      connected: boolean;
      connectedScenes: string[];
      sceneCount: number;
    };
  };
  capabilities: string[];
  phase: number;
}

export const HEALTH = {
  phase: 1,
  capabilities: [
    'health_check',
    'socket_io',
    'database',
    'static_serving',
    'tournament_crud',
    'team_crud',
    'player_crud',
    'match_crud',
    'scoreboard',
    'player_intro',
    'team_intro',
    'draft',
    'statistics',
    'mvp',
    'overlay',
  ],
};
