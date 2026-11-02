export const ARENA = {
  navy: '#0B1020',
  deepSurface: '#111C35',
  blue: '#237BFF',
  cyan: '#00D9FF',
  red: '#F04452',
  background: '#080D19',
  surface: '#182238',
  primaryText: '#FFFFFF',
  secondaryText: '#AAB5C8',
  success: '#20C997',
};

export const ROLES = ['EXP Laner', 'Jungler', 'Mid Laner', 'Gold Laner', 'Roamer'] as const;

export const FORMATS = ['BO1', 'BO3', 'BO5'] as const;

export const GRAPHIC_STATUSES = ['scheduled', 'upcoming', 'starting-soon', 'live', 'paused', 'completed'] as const;

export const GAME_STATUSES = ['pending', 'live', 'completed'] as const;

export const DRAFT_PHASES = ['ban', 'pick'] as const;

export const DRAFT_ACTIONS = ['ban', 'pick'] as const;

export const OBS_SCENES = ['Gameplay', 'Scoreboard', 'Player Intro', 'Team Intro', 'Draft', 'Statistics', 'MVP', 'Fullscreen'] as const;
