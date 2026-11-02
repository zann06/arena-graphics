import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tournaments } from '../db/schema.js';
import {
  createTournamentSchema,
  updateTournamentSchema,
  type CreateTournamentInput,
  type UpdateTournamentInput,
} from '../validation/schemas.js';

// Create tournament
export async function createTournament(req: FastifyRequest, res: FastifyReply) {
  try {
    const validation = createTournamentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as CreateTournamentInput;
    const now = Date.now();

    const result = await db.insert(tournaments).values({
      ...data,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning();

    return res.code(201).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to create tournament',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get all tournaments
export async function listTournaments(req: FastifyRequest, res: FastifyReply) {
  try {
    const result = await db.select().from(tournaments);
    return res.code(200).send(result);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to list tournaments',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get tournament by ID
export async function getTournament(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid tournament ID' });
    }

    const result = await db.select().from(tournaments).where(eq(tournaments.id, id));

    if (result.length === 0) {
      return res.code(404).send({ error: 'Tournament not found' });
    }

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get tournament',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Update tournament
export async function updateTournament(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid tournament ID' });
    }

    const validation = updateTournamentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as UpdateTournamentInput;

    // Check if tournament exists
    const existing = await db.select().from(tournaments).where(eq(tournaments.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Tournament not found' });
    }

    const result = await db
      .update(tournaments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id))
      .returning();

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to update tournament',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Delete tournament
export async function deleteTournament(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid tournament ID' });
    }

    // Check if tournament exists
    const existing = await db.select().from(tournaments).where(eq(tournaments.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Tournament not found' });
    }

    await db.delete(tournaments).where(eq(tournaments.id, id));

    return res.code(200).send({ message: 'Tournament deleted successfully' });
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to delete tournament',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
