import { pathToFileURL } from 'node:url';

export async function seed() {
  console.log('[Seed] Starting...');

  // Phase 1: No seed data (empty database)
  console.log('[Seed] Complete');

  return {
    tournaments: 0,
    teams: 0,
    players: 0,
    matches: 0,
    games: 0,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void seed();
}
