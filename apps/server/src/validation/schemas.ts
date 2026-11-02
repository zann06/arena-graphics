import { z } from 'zod';

// Tournament validation schemas
export const createTournamentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  logoPath: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color').default('#237bff'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color').default('#00d9ff'),
});

export const updateTournamentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  logoPath: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color').optional(),
});

// Team validation schemas
export const createTeamSchema = z.object({
  tournamentId: z.number().int().positive('Tournament ID must be a positive integer'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be less than 100 characters'),
  shortName: z.string().min(2, 'Short name must be at least 2 characters').max(10, 'Short name must be less than 10 characters'),
  logoPath: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color').default('#237bff'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color').default('#00d9ff'),
});

export const updateTeamSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be less than 100 characters').optional(),
  shortName: z.string().min(2, 'Short name must be at least 2 characters').max(10, 'Short name must be less than 10 characters').optional(),
  logoPath: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color').optional(),
});

// Player validation schemas
export const playerRoleSchema = z.enum(['EXP Laner', 'Jungler', 'Mid Laner', 'Gold Laner', 'Roamer']);

export const createPlayerSchema = z.object({
  teamId: z.number().int().positive('Team ID must be a positive integer'),
  realName: z.string().min(2, 'Real name must be at least 2 characters').max(100, 'Real name must be less than 100 characters'),
  nickname: z.string().min(2, 'Nickname must be at least 2 characters').max(50, 'Nickname must be less than 50 characters'),
  photoPath: z.string().optional(),
  role: playerRoleSchema,
  jerseyNumber: z.number().int().min(1).max(99).optional(),
});

export const updatePlayerSchema = z.object({
  realName: z.string().min(2, 'Real name must be at least 2 characters').max(100, 'Real name must be less than 100 characters').optional(),
  nickname: z.string().min(2, 'Nickname must be at least 2 characters').max(50, 'Nickname must be less than 50 characters').optional(),
  photoPath: z.string().optional(),
  role: playerRoleSchema.optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
});

// Match validation schemas
export const matchFormatSchema = z.enum(['BO1', 'BO3', 'BO5']);
export const matchStatusSchema = z.enum(['scheduled', 'upcoming', 'starting-soon', 'live', 'paused', 'completed']);

export const createMatchSchema = z.object({
  tournamentId: z.number().int().positive('Tournament ID must be a positive integer'),
  teamAId: z.number().int().positive('Team A ID must be a positive integer'),
  teamBId: z.number().int().positive('Team B ID must be a positive integer'),
  format: matchFormatSchema.default('BO1'),
  scheduledAt: z.string().datetime().optional(),
  status: matchStatusSchema.default('scheduled'),
}).refine((data) => data.teamAId !== data.teamBId, {
  message: 'Team A and Team B must be different teams',
  path: ['teamBId'],
});

export const updateMatchSchema = z.object({
  teamAId: z.number().int().positive('Team A ID must be a positive integer').optional(),
  teamBId: z.number().int().positive('Team B ID must be a positive integer').optional(),
  format: matchFormatSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  status: matchStatusSchema.optional(),
});

// Game result validation schemas
export const gameStatusSchema = z.enum(['pending', 'live', 'completed']);

export const recordGameResultSchema = z.object({
  gameNumber: z.number().int().min(1).max(5, 'Game number must be between 1 and 5'),
  blueTeamId: z.number().int().positive('Blue team ID must be a positive integer'),
  redTeamId: z.number().int().positive('Red team ID must be a positive integer'),
  winnerTeamId: z.number().int().positive('Winner team ID must be a positive integer'),
  durationSeconds: z.number().int().positive().optional(),
}).refine((data) => data.blueTeamId !== data.redTeamId, {
  message: 'Blue team and Red team must be different teams',
  path: ['redTeamId'],
}).refine((data) => data.winnerTeamId === data.blueTeamId || data.winnerTeamId === data.redTeamId, {
  message: 'Winner team must be either blue team or red team',
  path: ['winnerTeamId'],
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type RecordGameResultInput = z.infer<typeof recordGameResultSchema>;
