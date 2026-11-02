import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const tournaments = sqliteTable('tournaments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  logoPath: text('logoPath'),
  primaryColor: text('primaryColor', { length: 7 }).default('#237bff'),
  secondaryColor: text('secondaryColor', { length: 7 }).default('#00d9ff'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournamentId').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  shortName: text('shortName', { length: 10 }).notNull(),
  logoPath: text('logoPath'),
  primaryColor: text('primaryColor', { length: 7 }).default('#237bff'),
  secondaryColor: text('secondaryColor', { length: 7 }).default('#00d9ff'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('teamId').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  realName: text('realName').notNull(),
  nickname: text('nickname').notNull(),
  photoPath: text('photoPath'),
  role: text('role', { enum: ['EXP Laner', 'Jungler', 'Mid Laner', 'Gold Laner', 'Roamer'] }).notNull(),
  jerseyNumber: integer('jerseyNumber'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournamentId').references(() => tournaments.id, { onDelete: 'cascade' }).notNull(),
  teamAId: integer('teamAId').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  teamBId: integer('teamBId').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  format: text('format', { enum: ['BO1', 'BO3', 'BO5'] }).notNull().default('BO1'),
  status: text('status', { enum: ['scheduled', 'upcoming', 'starting-soon', 'live', 'paused', 'completed'] }).notNull().default('scheduled'),
  currentGame: integer('currentGame').notNull().default(1),
  scheduledAt: integer('scheduledAt', { mode: 'timestamp_ms' }),
  winnerTeamId: integer('winnerTeamId').references(() => teams.id),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const games = sqliteTable('games', {
  matchId: integer('matchId').notNull(),
  gameNumber: integer('gameNumber').notNull(),
  winnerTeamId: integer('winnerTeamId').references(() => teams.id),
  blueTeamId: integer('blueTeamId').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  redTeamId: integer('redTeamId').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  durationSeconds: integer('durationSeconds'),
  status: text('status', { enum: ['pending', 'live', 'completed'] }).notNull().default('pending'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
  pk: primaryKey({ name: 'games_pk', columns: [table.matchId, table.gameNumber] }),
}));

export const heroes = sqliteTable('heroes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  portraitPath: text('portraitPath'),
  assetVersion: integer('assetVersion').notNull().default(1),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const draftSlots = sqliteTable('draftSlots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('gameId').notNull(),
  teamId: integer('teamId').notNull(),
  phase: text('phase', { enum: ['ban', 'pick'] }).notNull(),
  slotNumber: integer('slotNumber').notNull(),
  heroId: integer('heroId'),
  actionType: text('actionType', { enum: ['ban', 'pick'] }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const gameStatistics = sqliteTable('gameStatistics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('gameId').notNull(),
  teamId: integer('teamId').notNull(),
  kills: integer('kills').notNull().default(0),
  turrets: integer('turrets').notNull().default(0),
  turtles: integer('turtles').notNull().default(0),
  lords: integer('lords').notNull().default(0),
  goldDifference: integer('goldDifference').notNull().default(0),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const mvpRecords = sqliteTable('mvpRecords', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('matchId').notNull(),
  gameId: integer('gameId').notNull(),
  playerId: integer('playerId').notNull(),
  heroId: integer('heroId'),
  kills: integer('kills').notNull().default(0),
  deaths: integer('deaths').notNull().default(0),
  assists: integer('assists').notNull().default(0),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
});

export const graphicsTemplates = sqliteTable('graphicsTemplates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  templateType: text('templateType', { enum: ['scoreboard', 'playerIntro', 'teamIntro', 'draft', 'statistics', 'mvp', 'fullscreen'] }).notNull(),
  configurationJson: text('configurationJson').notNull(),
  isActive: integer('isActive').notNull().default(0),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
});

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull(),
  originalName: text('originalName').notNull(),
  storedName: text('storedName').notNull(),
  mimeType: text('mimeType').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  url: text('url').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
});

export const matchEvents = sqliteTable('matchEvents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('matchId').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  eventType: text('eventType', { enum: ['score_update', 'game_start', 'game_complete', 'draft_update', 'mvp_selected', 'overlay_show', 'overlay_hide'] }).notNull(),
  payloadJson: text('payloadJson').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
});
