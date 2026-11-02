import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { validateEnv } from '../config/env.js';
import * as schema from './schema.js';

let dbInstance: any | null = null;
let client: Client | null = null;

// Workspace root: three levels up from apps/server (src/db or dist).
const workspaceRoot = resolve(fileURLToPath(import.meta.url), '../../../..');
const defaultDatabaseFile = resolve(workspaceRoot, 'data/arena.sqlite');

/**
 * Resolve the SQLite file location.
 *
 * - Explicit absolute `file:` URLs are used as-is.
 * - Relative `file:` paths resolve against the workspace root, so the server
 *   behaves the same whichever directory it is started from.
 */
function resolveDatabaseUrl(): string {
  const configured = validateEnv().databaseUrl;
  if (!configured) return `file:${defaultDatabaseFile.replace(/\\/g, '/')}`;

  if (configured.startsWith('file:')) {
    const rawPath = configured.slice('file:'.length);
    const absolute =
      rawPath.startsWith('/') || /^[A-Za-z]:/.test(rawPath) ? rawPath : resolve(workspaceRoot, rawPath);
    return `file:${absolute.replace(/\\/g, '/')}`;
  }
  return configured;
}

/**
 * Make sure the directory that will hold a local SQLite file exists before the
 * client opens it. libSQL/SQLite create the file but not its parent directory,
 * so a fresh data dir (e.g. CI's `.ci-data`) would otherwise fail to open.
 */
function ensureDatabaseDirectory(url: string): void {
  if (!url.startsWith('file:')) return;
  const rawPath = url.slice('file:'.length).split(/[?#]/, 1)[0] ?? '';
  if (!rawPath || rawPath.startsWith(':memory:')) return;
  try {
    mkdirSync(dirname(rawPath), { recursive: true });
  } catch {
    // Best effort: let the client surface a precise error if this fails.
  }
}

const dbUrl = resolveDatabaseUrl();
ensureDatabaseDirectory(dbUrl);

export function initDB(): any {
  if (dbInstance) return dbInstance;

  client = createClient({ url: dbUrl });
  dbInstance = drizzle(client, { schema });

  return dbInstance;
}

export function getDB(): any {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return dbInstance;
}

export function getDBClient(): Client {
  if (!client) {
    throw new Error('Database client not initialized. Call initDB() first.');
  }
  return client;
}

export function getDatabaseUrl(): string {
  return dbUrl;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
  }
}

// Export db instance for convenience (will be initialized by initDB)
export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (!dbInstance) {
      throw new Error('Database not initialized. Call initDB() first.');
    }
    return dbInstance[prop];
  },
});
