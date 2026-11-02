import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './database/migrations',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./database/arena.sqlite',
  },
  verbose: true,
  strict: true,
});
