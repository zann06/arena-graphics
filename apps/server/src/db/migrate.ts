import { createClient } from '@libsql/client';
import { pathToFileURL } from 'node:url';
import { getDatabaseUrl } from './client.js';

interface Migration {
  id: string;
  statements: string[];
}

/**
 * Additive migrations. Each migration runs once and is recorded in
 * `_arena_migrations`, so schema can evolve without dropping operator data.
 */
const MIGRATIONS: Migration[] = [
  {
    id: '2026-11-01_initial_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        logoPath TEXT,
        primaryColor TEXT DEFAULT '#237bff',
        secondaryColor TEXT DEFAULT '#00d9ff',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournamentId INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        shortName TEXT NOT NULL,
        logoPath TEXT,
        primaryColor TEXT DEFAULT '#237bff',
        secondaryColor TEXT DEFAULT '#00d9ff',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teamId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        realName TEXT NOT NULL,
        nickname TEXT NOT NULL,
        photoPath TEXT,
        role TEXT NOT NULL,
        jerseyNumber INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournamentId INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        teamAId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        teamBId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        format TEXT NOT NULL DEFAULT 'BO1',
        status TEXT NOT NULL DEFAULT 'scheduled',
        currentGame INTEGER NOT NULL DEFAULT 1,
        scheduledAt INTEGER,
        winnerTeamId INTEGER REFERENCES teams(id),
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS games (
        matchId INTEGER NOT NULL,
        gameNumber INTEGER NOT NULL,
        winnerTeamId INTEGER REFERENCES teams(id),
        blueTeamId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        redTeamId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        durationSeconds INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        PRIMARY KEY (matchId, gameNumber)
      )`,
      `CREATE TABLE IF NOT EXISTS heroes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        portraitPath TEXT,
        assetVersion INTEGER NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS draftSlots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId INTEGER NOT NULL,
        teamId INTEGER NOT NULL,
        phase TEXT NOT NULL,
        slotNumber INTEGER NOT NULL,
        heroId INTEGER,
        actionType TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS gameStatistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId INTEGER NOT NULL,
        teamId INTEGER NOT NULL,
        kills INTEGER NOT NULL DEFAULT 0,
        turrets INTEGER NOT NULL DEFAULT 0,
        turtles INTEGER NOT NULL DEFAULT 0,
        lords INTEGER NOT NULL DEFAULT 0,
        goldDifference INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS mvpRecords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matchId INTEGER NOT NULL,
        gameId INTEGER NOT NULL,
        playerId INTEGER NOT NULL,
        heroId INTEGER,
        kills INTEGER NOT NULL DEFAULT 0,
        deaths INTEGER NOT NULL DEFAULT 0,
        assists INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS graphicsTemplates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        templateType TEXT NOT NULL,
        configurationJson TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS matchEvents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matchId INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        eventType TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      )`,
    ],
  },
  {
    id: '2026-11-02_mlbb_per_game_data',
    statements: [
      `ALTER TABLE draftSlots ADD COLUMN gameKey INTEGER`,
      `ALTER TABLE draftSlots ADD COLUMN matchId INTEGER`,
      `ALTER TABLE gameStatistics ADD COLUMN gameNumber INTEGER`,
      `ALTER TABLE mvpRecords ADD COLUMN gameNumber INTEGER`,
      `CREATE INDEX IF NOT EXISTS idx_draftSlots_gameKey ON draftSlots(gameKey)`,
      `CREATE INDEX IF NOT EXISTS idx_gameStatistics_gameKey ON gameStatistics(gameId)`,
      `CREATE INDEX IF NOT EXISTS idx_mvpRecords_match_game ON mvpRecords(matchId, gameId)`,
      `CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        originalName TEXT NOT NULL,
        storedName TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        sizeBytes INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        url TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS appSettings (
        key TEXT PRIMARY KEY,
        valueJson TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
    ],
  },
  {
    id: '2026-11-02_template_active_flag',
    statements: [
      `ALTER TABLE graphicsTemplates ADD COLUMN isActive INTEGER NOT NULL DEFAULT 0`,
    ],
  },
];

/** Columns are added idempotently because SQLite has no `ADD COLUMN IF NOT EXISTS`. */async function hasColumn(client: ReturnType<typeof createClient>, table: string, column: string): Promise<boolean> {
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => String((row as Record<string, unknown>).name) === column);
}

export async function migrate(): Promise<void> {
  console.log('[Migrations] Starting...');
  const client = createClient({ url: getDatabaseUrl() });

  try {
    await client.execute(
      `CREATE TABLE IF NOT EXISTS _arena_migrations (id TEXT PRIMARY KEY, appliedAt INTEGER NOT NULL)`
    );
    const applied = await client.execute('SELECT id FROM _arena_migrations');
    const done = new Set(applied.rows.map((row) => String((row as Record<string, unknown>).id)));

    for (const migration of MIGRATIONS) {
      if (done.has(migration.id)) continue;
      for (const statement of migration.statements) {
        const addColumn = statement.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+)/);
        if (addColumn) {
          const [, table, column] = addColumn;
          if (await hasColumn(client, table!, column!)) continue;
        }
        await client.execute(statement);
      }
      await client.execute({
        sql: 'INSERT INTO _arena_migrations (id, appliedAt) VALUES (?, ?)',
        args: [migration.id, Date.now()],
      });
      console.log(`[Migrations] Applied ${migration.id}`);
    }
    console.log('[Migrations] Complete');
  } catch (err) {
    console.error('[Migrations] Failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Cross-platform "run as main" check: comparing against `file://${argv[1]}`
// never matches on Windows (backslash paths), so use the URL conversion.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void migrate();
}
