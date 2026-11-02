import { pathToFileURL } from 'node:url';
import { closeDB, getDB, initDB } from './client.js';
import { heroes, matches, players, teams, tournaments } from './schema.js';

/**
 * Demo dataset for `pnpm setup -Seed` / `pnpm db:seed` and for the smoke tests.
 * Idempotent: it does nothing when the demo tournament already exists.
 */
const DEMO_TOURNAMENT = 'Arena Graphics Demo Cup';

export interface SeedSummary {
  tournaments: number;
  teams: number;
  players: number;
  matches: number;
  heroes: number;
}

interface DemoPlayer {
  realName: string;
  nickname: string;
  role: 'EXP Laner' | 'Jungler' | 'Mid Laner' | 'Gold Laner' | 'Roamer';
  jerseyNumber: number;
}

interface DemoTeam {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  players: DemoPlayer[];
}

const DEMO_TEAMS: DemoTeam[] = [
  {
    name: 'Rex Regum Qeon',
    shortName: 'RRQ',
    primaryColor: '#f43f2e',
    secondaryColor: '#ffd166',
    players: [
      { realName: 'Andre Putra', nickname: 'RRQ1', role: 'Gold Laner', jerseyNumber: 1 },
      { realName: 'Bagas Pratama', nickname: 'RRQ2', role: 'Mid Laner', jerseyNumber: 2 },
      { realName: 'Candra Wijaya', nickname: 'RRQ3', role: 'EXP Laner', jerseyNumber: 3 },
      { realName: 'Dimas Saputra', nickname: 'RRQ4', role: 'Jungler', jerseyNumber: 4 },
      { realName: 'Eko Nugroho', nickname: 'RRQ5', role: 'Roamer', jerseyNumber: 5 },
    ],
  },
  {
    name: 'ONIC Esports',
    shortName: 'ONIC',
    primaryColor: '#ffd200',
    secondaryColor: '#1f2937',
    players: [
      { realName: 'Fajar Ramadhan', nickname: 'ONIC1', role: 'Gold Laner', jerseyNumber: 11 },
      { realName: 'Gilang Saputra', nickname: 'ONIC2', role: 'Mid Laner', jerseyNumber: 12 },
      { realName: 'Hendra Gunawan', nickname: 'ONIC3', role: 'EXP Laner', jerseyNumber: 13 },
      { realName: 'Irfan Maulana', nickname: 'ONIC4', role: 'Jungler', jerseyNumber: 14 },
      { realName: 'Joko Susilo', nickname: 'ONIC5', role: 'Roamer', jerseyNumber: 15 },
    ],
  },
];

const DEMO_HEROES = [
  'Ling',
  'Tigreal',
  'Valentina',
  'Fredrinn',
  'Beatrix',
  'Fanny',
  'Gusion',
  'Chou',
  'Atlas',
  'Estes',
  'Claude',
  'Lancelot',
  'Kagura',
];

const EMPTY: SeedSummary = { tournaments: 0, teams: 0, players: 0, matches: 0, heroes: 0 };

export async function seed(): Promise<SeedSummary> {
  console.log('[Seed] Starting...');
  initDB();
  const db = getDB();

  const existing = await db.select().from(tournaments);
  if (existing.length > 0) {
    console.log(`[Seed] ${existing.length} tournament(s) already present — skipping demo data`);
    return EMPTY;
  }

  const now = new Date();

  const [tournament] = await db
    .insert(tournaments)
    .values({
      name: DEMO_TOURNAMENT,
      description: 'Turnamen contoh untuk mencoba ARENA GRAPHICS.',
      primaryColor: '#237bff',
      secondaryColor: '#00d9ff',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const createdTeams: any[] = [];
  for (const team of DEMO_TEAMS) {
    const [created] = await db
      .insert(teams)
      .values({
        tournamentId: tournament.id,
        name: team.name,
        shortName: team.shortName,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    createdTeams.push(created);

    await db.insert(players).values(
      team.players.map((player) => ({
        teamId: created.id,
        realName: player.realName,
        nickname: player.nickname,
        role: player.role,
        jerseyNumber: player.jerseyNumber,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  const blue = createdTeams[0];
  const red = createdTeams[1];

  await db.insert(matches).values({
    tournamentId: tournament.id,
    teamAId: blue.id,
    teamBId: red.id,
    format: 'BO3',
    status: 'live',
    currentGame: 1,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .insert(heroes)
    .values(DEMO_HEROES.map((name) => ({ name, createdAt: now, updatedAt: now })));

  const summary: SeedSummary = {
    tournaments: 1,
    teams: createdTeams.length,
    players: DEMO_TEAMS.reduce((total, team) => total + team.players.length, 0),
    matches: 1,
    heroes: DEMO_HEROES.length,
  };

  console.log('[Seed] Complete', summary);
  console.log(`[Seed] Demo match: ${blue.shortName} vs ${red.shortName} (BO3)`);
  return summary;
}

// Cross-platform "run as main" check (see migrate.ts).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .catch((err) => {
      console.error('[Seed] Failed:', err);
      process.exitCode = 1;
    })
    .finally(() => closeDB());
}
