import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { matches, tournaments, teams, games } from '../db/schema.js';
import { refreshSelectedMatch } from '../realtime/state.js';
import {
  createMatchSchema,
  updateMatchSchema,
  recordGameResultSchema,
  type CreateMatchInput,
  type UpdateMatchInput,
  type RecordGameResultInput,
} from '../validation/schemas.js';

// Helper function to calculate series score
function calculateSeriesScore(gameResults: any[], bestOf: 'BO1' | 'BO3' | 'BO5') {
  const teamAWins = gameResults.filter(g => g.winnerTeamId === gameResults[0]?.blueTeamId).length;
  const teamBWins = gameResults.filter(g => g.winnerTeamId === gameResults[0]?.redTeamId).length;
  
  const winsNeeded = bestOf === 'BO1' ? 1 : bestOf === 'BO3' ? 2 : 3;
  const isComplete = teamAWins >= winsNeeded || teamBWins >= winsNeeded;
  const winnerTeamId = teamAWins >= winsNeeded ? gameResults[0]?.blueTeamId : 
                       teamBWins >= winsNeeded ? gameResults[0]?.redTeamId : null;
  
  return { teamAWins, teamBWins, isComplete, winnerTeamId };
}

// Create match
export async function createMatch(req: FastifyRequest, res: FastifyReply) {
  try {
    const validation = createMatchSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as CreateMatchInput;

    // Check if tournament exists
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, data.tournamentId));
    if (tournament.length === 0) {
      return res.code(404).send({ error: 'Tournament not found' });
    }

    // Check if both teams exist
    const teamA = await db.select().from(teams).where(eq(teams.id, data.teamAId));
    const teamB = await db.select().from(teams).where(eq(teams.id, data.teamBId));
    
    if (teamA.length === 0) {
      return res.code(404).send({ error: 'Team A not found' });
    }
    if (teamB.length === 0) {
      return res.code(404).send({ error: 'Team B not found' });
    }

    const now = Date.now();

    const result = await db.insert(matches).values({
      tournamentId: data.tournamentId,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      format: data.format || 'BO1',
      status: data.status || 'scheduled',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      currentGame: 1,
      winnerTeamId: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).returning();

    return res.code(201).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to create match',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get all matches
export async function listMatches(req: FastifyRequest, res: FastifyReply) {
  try {
    const result = await db.select().from(matches);
    return res.code(200).send(result);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to list matches',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get match by ID
export async function getMatch(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid match ID' });
    }

    const result = await db.select().from(matches).where(eq(matches.id, id));

    if (result.length === 0) {
      return res.code(404).send({ error: 'Match not found' });
    }

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get match',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get matches by tournament
export async function getMatchesByTournament(
  req: FastifyRequest<{ Params: { tournamentId: string } }>,
  res: FastifyReply
) {
  try {
    const tournamentId = parseInt(req.params.tournamentId, 10);
    
    if (isNaN(tournamentId)) {
      return res.code(400).send({ error: 'Invalid tournament ID' });
    }

    const result = await db.select().from(matches).where(eq(matches.tournamentId, tournamentId));

    return res.code(200).send(result);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get matches by tournament',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Update match
export async function updateMatch(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid match ID' });
    }

    const validation = updateMatchSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as UpdateMatchInput;

    // Check if match exists
    const existing = await db.select().from(matches).where(eq(matches.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Match not found' });
    }

    const result = await db
      .update(matches)
      .set({
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, id))
      .returning();

    return res.code(200).send(result[0]);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to update match',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Delete match
export async function deleteMatch(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.code(400).send({ error: 'Invalid match ID' });
    }

    // Check if match exists
    const existing = await db.select().from(matches).where(eq(matches.id, id));
    if (existing.length === 0) {
      return res.code(404).send({ error: 'Match not found' });
    }

    await db.delete(matches).where(eq(matches.id, id));

    return res.code(200).send({ message: 'Match deleted successfully' });
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to delete match',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Record game result
export async function recordGameResult(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const matchId = parseInt(req.params.id, 10);
    
    if (isNaN(matchId)) {
      return res.code(400).send({ error: 'Invalid match ID' });
    }

    const validation = recordGameResultSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.code(400).send({
        error: 'Validation failed',
        details: validation.error.issues,
      });
    }

    const data = validation.data as RecordGameResultInput;

    // Check if match exists
    const match = await db.select().from(matches).where(eq(matches.id, matchId));
    if (match.length === 0) {
      return res.code(404).send({ error: 'Match not found' });
    }

    const matchData = match[0];

    // Validate game number against match format
    const maxGames = matchData.format === 'BO1' ? 1 : matchData.format === 'BO3' ? 3 : 5;
    if (data.gameNumber > maxGames) {
      return res.code(400).send({ 
        error: `Game number cannot exceed ${maxGames} for ${matchData.format} format` 
      });
    }

    // Check if game already exists
    const existingGame = await db.select().from(games).where(
      and(eq(games.matchId, matchId), eq(games.gameNumber, data.gameNumber))
    );

    const now = Date.now();

    if (existingGame.length > 0) {
      // Update existing game
      await db
        .update(games)
        .set({
          blueTeamId: data.blueTeamId,
          redTeamId: data.redTeamId,
          winnerTeamId: data.winnerTeamId,
          durationSeconds: data.durationSeconds || null,
          status: 'completed',
          updatedAt: new Date(now),
        })
        .where(
          and(eq(games.matchId, matchId), eq(games.gameNumber, data.gameNumber))
        );
    } else {
      // Insert new game
      await db.insert(games).values({
        matchId,
        gameNumber: data.gameNumber,
        blueTeamId: data.blueTeamId,
        redTeamId: data.redTeamId,
        winnerTeamId: data.winnerTeamId,
        durationSeconds: data.durationSeconds || null,
        status: 'completed',
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    }

    // Get all completed games for this match
    const allGames = await db.select().from(games).where(eq(games.matchId, matchId));

    // Calculate series score
    const { teamAWins, teamBWins, isComplete, winnerTeamId } = calculateSeriesScore(allGames, matchData.format);

    // Update match if series is complete
    if (isComplete) {
      await db
        .update(matches)
        .set({
          winnerTeamId,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId));
    }

    // Get updated game
    const updatedGame = await db.select().from(games).where(
      and(eq(games.matchId, matchId), eq(games.gameNumber, data.gameNumber))
    );

    // Push the new score to every connected overlay/dashboard
    await refreshSelectedMatch();

    return res.code(200).send({
      game: updatedGame[0],
      seriesScore: { teamAWins, teamBWins },
      isSeriesComplete: isComplete,
      winnerTeamId: isComplete ? winnerTeamId : null,
    });
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to record game result',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Get match games
export async function getMatchGames(
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) {
  try {
    const matchId = parseInt(req.params.id, 10);
    
    if (isNaN(matchId)) {
      return res.code(400).send({ error: 'Invalid match ID' });
    }

    // Check if match exists
    const match = await db.select().from(matches).where(eq(matches.id, matchId));
    if (match.length === 0) {
      return res.code(404).send({ error: 'Match not found' });
    }

    const result = await db.select().from(games).where(eq(games.matchId, matchId));

    return res.code(200).send(result);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({
      error: 'Failed to get match games',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
