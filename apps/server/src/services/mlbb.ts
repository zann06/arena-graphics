import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  draftSlots,
  gameStatistics,
  games,
  heroes,
  matches,
  mvpRecords,
  players,
  teams,
  tournaments,
} from '../db/schema.js';
import type {
  DraftSlotData,
  DraftState,
  MvpData,
  PlayerSummary,
  ScoreboardData,
  StatisticsData,
  TeamStatistics,
  TeamSummary,
} from '@arena/shared/types/realtime.js';

/**
 * Match-scoped persistence for MLBB features (draft, statistics, MVP).
 *
 * The schema keys these tables by gameId and games only exist once a result is
 * recorded, so persisted operator data uses a deterministic synthetic key
 * (matchId * 100 + gameNumber) for the game being played.
 */
export const DRAFT_FORMATS = {
  standard: { bansPerSide: 5, picksPerSide: 5, label: 'Standard · 5 ban / 5 pick' },
  quick: { bansPerSide: 3, picksPerSide: 5, label: 'Quick · 3 ban / 5 pick' },
} as const;

export type DraftFormatKey = keyof typeof DRAFT_FORMATS;

type TeamRow = typeof teams.$inferSelect;
type PlayerRow = typeof players.$inferSelect;
type HeroRow = typeof heroes.$inferSelect;
type MatchRow = typeof matches.$inferSelect;
type GameRow = typeof games.$inferSelect;
type DraftRow = typeof draftSlots.$inferSelect;

interface ScoreboardRows {
  match: MatchRow;
  teamA: TeamRow;
  teamB: TeamRow;
  tournamentName: string;
  gameRows: GameRow[];
}

export function draftGameKey(matchId: number, gameNumber: number): number {
  return matchId * 100 + gameNumber;
}

export function toTeamSummary(team: TeamRow): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logoPath: team.logoPath ?? null,
    primaryColor: team.primaryColor ?? '#237bff',
    secondaryColor: team.secondaryColor ?? '#00d9ff',
  };
}

export function toPlayerSummary(player: PlayerRow): PlayerSummary {
  return {
    id: player.id,
    nickname: player.nickname,
    realName: player.realName,
    role: player.role,
    jerseyNumber: player.jerseyNumber ?? null,
    photoPath: player.photoPath ?? null,
  };
}

export function zeroStats(): TeamStatistics {
  return { kills: 0, turrets: 0, turtles: 0, lords: 0, gold: 0 };
}

export function emptyStatisticsData(): StatisticsData {
  return {
    blue: zeroStats(),
    red: zeroStats(),
    durationSeconds: null,
    label: 'OPERATOR ENTERED',
  };
}

export function emptyDraftSlots(format: DraftFormatKey): DraftSlotData[] {
  const config = DRAFT_FORMATS[format] ?? DRAFT_FORMATS.standard;
  const slots: DraftSlotData[] = [];
  for (const side of ['blue', 'red'] as const) {
    for (let i = 1; i <= config.bansPerSide; i++) {
      slots.push({ side, actionType: 'ban', slotNumber: i, heroId: null, heroName: null, portraitPath: null });
    }
    for (let i = 1; i <= config.picksPerSide; i++) {
      slots.push({ side, actionType: 'pick', slotNumber: i, heroId: null, heroName: null, portraitPath: null });
    }
  }
  return slots;
}

async function loadScoreboardRows(matchId: number): Promise<ScoreboardRows | null> {
  const matchRows = (await db.select().from(matches).where(eq(matches.id, matchId))) as MatchRow[];
  const match = matchRows[0];
  if (!match) return null;

  const tournamentRows = (await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, match.tournamentId))) as Array<typeof tournaments.$inferSelect>;
  const teamRows = (await db.select().from(teams)) as TeamRow[];
  const teamA = teamRows.find((team) => team.id === match.teamAId);
  const teamB = teamRows.find((team) => team.id === match.teamBId);
  if (!teamA || !teamB) return null;

  const gameRows = (await db.select().from(games).where(eq(games.matchId, matchId))) as GameRow[];

  return {
    match,
    teamA,
    teamB,
    tournamentName: tournamentRows[0]?.name ?? 'Tournament',
    gameRows,
  };
}

export async function loadScoreboard(matchId: number): Promise<ScoreboardData | null> {
  const rows = await loadScoreboardRows(matchId);
  if (!rows) return null;
  const { match, teamA, teamB, gameRows } = rows;

  const blueWins = gameRows.filter((game) => game.winnerTeamId === match.teamAId).length;
  const redWins = gameRows.filter((game) => game.winnerTeamId === match.teamBId).length;

  const lastGame = [...gameRows].sort((a, b) => b.gameNumber - a.gameNumber)[0];
  const blueId = lastGame?.blueTeamId ?? match.teamAId;
  const redId = lastGame?.redTeamId ?? match.teamBId;
  const blueTeam = blueId === teamB.id ? teamB : teamA;
  const redTeam = redId === teamA.id ? teamA : teamB;

  return {
    matchId: match.id,
    tournamentId: match.tournamentId,
    tournamentName: rows.tournamentName,
    format: match.format,
    status: match.status,
    gameNumber: match.currentGame,
    blue: toTeamSummary(blueTeam),
    red: toTeamSummary(redTeam),
    blueWins,
    redWins,
  };
}

export async function loadRoster(teamId: number): Promise<PlayerSummary[]> {
  const rows = (await db.select().from(players).where(eq(players.teamId, teamId))) as PlayerRow[];
  return rows.map(toPlayerSummary);
}

export async function loadTeamSummary(teamId: number): Promise<TeamSummary | null> {
  const rows = (await db.select().from(teams).where(eq(teams.id, teamId))) as TeamRow[];
  return rows[0] ? toTeamSummary(rows[0]) : null;
}

export async function loadHero(heroId: number): Promise<HeroRow | null> {
  const rows = (await db.select().from(heroes).where(eq(heroes.id, heroId))) as HeroRow[];
  return rows[0] ?? null;
}

export async function loadDraft(
  matchId: number,
  gameNumber: number,
  format: DraftFormatKey
): Promise<DraftState> {
  const key = draftGameKey(matchId, gameNumber);
  const scoreboard = await loadScoreboard(matchId);
  const slots = emptyDraftSlots(format);
  if (!scoreboard) return { matchId, gameNumber, format, slots };

  const rows = (await db.select().from(draftSlots).where(eq(draftSlots.gameId, key))) as DraftRow[];
  const heroRows = (await db.select().from(heroes)) as HeroRow[];
  const byId = new Map<number, HeroRow>(heroRows.map((hero) => [hero.id, hero]));

  for (const row of rows) {
    const side = row.teamId === scoreboard.blue.id ? 'blue' : 'red';
    const slot = slots.find(
      (candidate) =>
        candidate.side === side &&
        candidate.actionType === row.actionType &&
        candidate.slotNumber === row.slotNumber
    );
    if (!slot) continue;
    const hero = row.heroId != null ? byId.get(row.heroId) : undefined;
    slot.heroId = row.heroId ?? null;
    slot.heroName = hero?.name ?? null;
    slot.portraitPath = hero?.portraitPath ?? null;
  }

  return { matchId, gameNumber, format, slots };
}

export async function saveDraftSlot(params: {
  matchId: number;
  gameNumber: number;
  side: 'blue' | 'red';
  actionType: 'ban' | 'pick';
  slotNumber: number;
  heroId: number | null;
}): Promise<void> {
  const scoreboard = await loadScoreboard(params.matchId);
  if (!scoreboard) throw new Error('Match not found');

  const teamId = params.side === 'blue' ? scoreboard.blue.id : scoreboard.red.id;
  const key = draftGameKey(params.matchId, params.gameNumber);

  if (params.heroId != null) {
    const hero = await loadHero(params.heroId);
    if (!hero) {
      const err = new Error(`Hero ${params.heroId} not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
  }

  const existing = (await db
    .select()
    .from(draftSlots)
    .where(
      and(
        eq(draftSlots.gameId, key),
        eq(draftSlots.teamId, teamId),
        eq(draftSlots.actionType, params.actionType),
        eq(draftSlots.slotNumber, params.slotNumber)
      )
    )) as DraftRow[];

  const now = new Date();
  if (existing[0]) {
    await db
      .update(draftSlots)
      .set({ heroId: params.heroId, updatedAt: now })
      .where(eq(draftSlots.id, existing[0].id));
  } else {
    await db.insert(draftSlots).values({
      gameId: key,
      teamId,
      phase: params.actionType,
      actionType: params.actionType,
      slotNumber: params.slotNumber,
      heroId: params.heroId,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function resetDraftSlots(matchId: number, gameNumber: number): Promise<void> {
  await db.delete(draftSlots).where(eq(draftSlots.gameId, draftGameKey(matchId, gameNumber)));
}

export async function loadStatistics(matchId: number, gameNumber: number): Promise<StatisticsData> {
  const key = draftGameKey(matchId, gameNumber);
  const data = emptyStatisticsData();
  const scoreboard = await loadScoreboard(matchId);
  if (!scoreboard) return data;

  const rows = (await db.select().from(gameStatistics).where(eq(gameStatistics.gameId, key))) as Array<
    typeof gameStatistics.$inferSelect
  >;
  for (const row of rows) {
    const line: TeamStatistics = {
      kills: row.kills,
      turrets: row.turrets,
      turtles: row.turtles,
      lords: row.lords,
      gold: row.goldDifference,
    };
    if (row.teamId === scoreboard.blue.id) data.blue = line;
    else if (row.teamId === scoreboard.red.id) data.red = line;
  }

  const resultRows = (await db
    .select()
    .from(games)
    .where(and(eq(games.matchId, matchId), eq(games.gameNumber, gameNumber)))) as GameRow[];
  data.durationSeconds = resultRows[0]?.durationSeconds ?? null;
  return data;
}

export async function saveStatistics(params: {
  matchId: number;
  gameNumber: number;
  blue: TeamStatistics;
  red: TeamStatistics;
  durationSeconds: number | null;
}): Promise<StatisticsData> {
  const scoreboard = await loadScoreboard(params.matchId);
  if (!scoreboard) throw new Error('Match not found');

  const key = draftGameKey(params.matchId, params.gameNumber);
  const now = new Date();

  const lines: Array<[number, TeamStatistics]> = [
    [scoreboard.blue.id, params.blue],
    [scoreboard.red.id, params.red],
  ];

  for (const [teamId, stats] of lines) {
    const existing = (await db
      .select()
      .from(gameStatistics)
      .where(and(eq(gameStatistics.gameId, key), eq(gameStatistics.teamId, teamId)))) as Array<
      typeof gameStatistics.$inferSelect
    >;

    const values = {
      kills: stats.kills,
      turrets: stats.turrets,
      turtles: stats.turtles,
      lords: stats.lords,
      goldDifference: stats.gold,
      updatedAt: now,
    };

    if (existing[0]) {
      await db.update(gameStatistics).set(values).where(eq(gameStatistics.id, existing[0].id));
    } else {
      await db.insert(gameStatistics).values({ gameId: key, teamId, createdAt: now, ...values });
    }
  }

  if (params.durationSeconds != null) {
    const resultRows = (await db
      .select()
      .from(games)
      .where(and(eq(games.matchId, params.matchId), eq(games.gameNumber, params.gameNumber)))) as GameRow[];
    if (resultRows[0]) {
      await db
        .update(games)
        .set({ durationSeconds: params.durationSeconds, updatedAt: now })
        .where(and(eq(games.matchId, params.matchId), eq(games.gameNumber, params.gameNumber)));
    }
  }

  return {
    blue: params.blue,
    red: params.red,
    durationSeconds: params.durationSeconds,
    label: 'OPERATOR ENTERED',
  };
}

export async function loadMvp(matchId: number, gameNumber: number): Promise<MvpData | null> {
  const key = draftGameKey(matchId, gameNumber);
  const rows = (await db
    .select()
    .from(mvpRecords)
    .where(and(eq(mvpRecords.matchId, matchId), eq(mvpRecords.gameId, key)))) as Array<
    typeof mvpRecords.$inferSelect
  >;
  const record = rows[0];
  if (!record) return null;

  const playerRows = (await db.select().from(players).where(eq(players.id, record.playerId))) as PlayerRow[];
  const player = playerRows[0];
  if (!player) return null;

  const team = await loadTeamSummary(player.teamId);
  let heroName = '';
  if (record.heroId != null) {
    const hero = await loadHero(record.heroId);
    heroName = hero?.name ?? '';
  }

  return {
    playerId: player.id,
    nickname: player.nickname,
    realName: player.realName,
    role: player.role,
    teamName: team?.shortName ?? '',
    heroId: record.heroId ?? null,
    heroName,
    kills: record.kills,
    deaths: record.deaths,
    assists: record.assists,
  };
}

export async function saveMvp(params: {
  matchId: number;
  gameNumber: number;
  playerId: number;
  heroId: number | null;
  kills: number;
  deaths: number;
  assists: number;
}): Promise<MvpData> {
  const playerRows = (await db.select().from(players).where(eq(players.id, params.playerId))) as PlayerRow[];
  if (!playerRows[0]) throw new Error(`Player ${params.playerId} not found`);

  const key = draftGameKey(params.matchId, params.gameNumber);
  const now = new Date();

  const existing = (await db
    .select()
    .from(mvpRecords)
    .where(and(eq(mvpRecords.matchId, params.matchId), eq(mvpRecords.gameId, key)))) as Array<
    typeof mvpRecords.$inferSelect
  >;

  const values = {
    playerId: params.playerId,
    heroId: params.heroId,
    kills: params.kills,
    deaths: params.deaths,
    assists: params.assists,
  };

  if (existing[0]) {
    await db.update(mvpRecords).set(values).where(eq(mvpRecords.id, existing[0].id));
  } else {
    await db.insert(mvpRecords).values({ matchId: params.matchId, gameId: key, createdAt: now, ...values });
  }

  const loaded = await loadMvp(params.matchId, params.gameNumber);
  if (!loaded) throw new Error('Failed to load saved MVP');
  return loaded;
}
