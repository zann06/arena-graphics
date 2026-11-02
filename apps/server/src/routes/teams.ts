import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { teams, tournaments, players } from '../db/schema.js';
import {
  createTeamSchema,
  updateTeamSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
} from '../validation/schemas.js';

// Create team
export async function createTeam(req: FastifyRequest, res: FastifyReply) {
  try {
    const validation = createTeamSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as CreateTeamInput;

    // Check if tournament exists
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, data.tournamentId));
    if (tournament.length === 0) {
      return res.code(404).send({ error: 'Tournament not found' });
    }

    const now = Date.now();

    const result = await db.insert(teams).values({
      ...data,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning();

    return res.code(201).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to create team',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get all teams
export async function listTeams(req: FastifyRequest, res: FastifyReply) {
  try {
    const result = await db.select().from(teams);
    return res.code(200).send(result);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to list teams',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get team by ID
export async function getTeam(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid team ID' });
    }

    const result = await db.select().from(teams).where(eq(teams.id, id));

    if (result.length === 0) {
      return res.code(404).send({ error: 'Team not found' });
    }

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get team',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get team roster (players)
export async function getTeamRoster(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid team ID' });
    }

    // Check if team exists
    const team = await db.select().from(teams).where(eq(teams.id, id));
    if (team.length === 0) {
      return res.code(404).send({ error: 'Team not found' });
    }

    const roster = await db.select().from(players).where(eq(players.teamId, id));

    return res.code(200).send(roster);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get team roster',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Update team
export async function updateTeam(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid team ID' });
    }

    const validation = updateTeamSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as UpdateTeamInput;

    // Check if team exists
    const existing = await db.select().from(teams).where(eq(teams.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Team not found' });
    }

    const result = await db
      .update(teams)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to update team',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Delete team
export async function deleteTeam(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid team ID' });
    }

    // Check if team exists
    const existing = await db.select().from(teams).where(eq(teams.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Team not found' });
    }

    await db.delete(teams).where(eq(teams.id, id));

    return res.code(200).send({ message: 'Team deleted successfully' });
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to delete team',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
