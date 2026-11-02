import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { players, teams } from '../db/schema.js';
import {
  createPlayerSchema,
  updatePlayerSchema,
  type CreatePlayerInput,
  type UpdatePlayerInput,
} from '../validation/schemas.js';

// Create player
export async function createPlayer(req: FastifyRequest, res: FastifyReply) {
  try {
    const validation = createPlayerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as CreatePlayerInput;

    // Check if team exists
    const team = await db.select().from(teams).where(eq(teams.id, data.teamId));
    if (team.length === 0) {
      return res.code(404).send({ error: 'Team not found' });
    }

    const now = Date.now();

    const result = await db.insert(players).values({
      ...data,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning();

    return res.code(201).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to create player',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get all players
export async function listPlayers(req: FastifyRequest, res: FastifyReply) {
  try {
    const result = await db.select().from(players);
    return res.code(200).send(result);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to list players',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get player by ID
export async function getPlayer(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid player ID' });
    }

    const result = await db.select().from(players).where(eq(players.id, id));

    if (result.length === 0) {
      return res.code(404).send({ error: 'Player not found' });
    }

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get player',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get players by team ID
export async function getPlayersByTeam(
  req: FastifyRequest<{ Params: { teamId: string } }>,
  res: FastifyReply
) {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    
    if (isNaN(teamId)) {
      return res.code(400).send({ error: 'Invalid team ID' });
    }

    // Check if team exists
    const team = await db.select().from(teams).where(eq(teams.id, teamId));
    if (team.length === 0) {
      return res.code(404).send({ error: 'Team not found' });
    }

    const result = await db.select().from(players).where(eq(players.teamId, teamId));

    return res.code(200).send(result);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get players by team',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Update player
export async function updatePlayer(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid player ID' });
    }

    const validation = updatePlayerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as UpdatePlayerInput;

    // Check if player exists
    const existing = await db.select().from(players).where(eq(players.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Player not found' });
    }

    const result = await db
      .update(players)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(players.id, id))
      .returning();

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to update player',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Delete player
export async function deletePlayer(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid player ID' });
    }

    // Check if player exists
    const existing = await db.select().from(players).where(eq(players.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Player not found' });
    }

    await db.delete(players).where(eq(players.id, id));

    return res.code(200).send({ message: 'Player deleted successfully' });
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to delete player',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
