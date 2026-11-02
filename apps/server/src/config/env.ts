import { z } from 'zod';

const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

const envSchema = z.object({
  host: z.string().refine((val) => ipRegex.test(val) || val === 'localhost' || val === '127.0.0.1', {
    message: 'Invalid IP address or hostname',
  }).default('127.0.0.1'),
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  webOrigin: z.string().url(),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  databaseUrl: z.string().optional(),
  // OBS WebSocket connection (server-side only; the password never reaches the
  // browser). Default matches OBS Studio's built-in obs-websocket server.
  obsHost: z.string().default('127.0.0.1'),
  obsPort: z.coerce.number().int().min(1).max(65535).default(4455),
  obsPassword: z.string().default(''),
  obsAutoConnect: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || String(v).toLowerCase() === 'true')
    .default(false),
  // Root directory for uploaded assets. Defaults to ARENA_DATA_DIR or a local
  // `data` folder at the workspace root (resolved in the storage service).
  dataDir: z.string().optional(),
}).transform((env) => {
  // `.env` only holds uppercase keys (HOST, PORT, DATABASE_URL, ...); surface
  // DATABASE_URL explicitly so the schema key and the file key stay in sync.
  const databaseUrl = env.databaseUrl ?? (process.env.DATABASE_URL?.trim() || undefined);
  return { ...env, databaseUrl };
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
  const parsed = envSchema.safeParse({
    host: process.env.HOST || '127.0.0.1',
    port: process.env.PORT || 3000,
    webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
    logLevel: process.env.LOG_LEVEL || 'info',
    databaseUrl,
    obsHost: process.env.OBS_HOST || '127.0.0.1',
    obsPort: process.env.OBS_PORT || 4455,
    obsPassword: process.env.OBS_PASSWORD || '',
    obsAutoConnect: process.env.OBS_AUTO_CONNECT || 'false',
    dataDir: process.env.ARENA_DATA_DIR?.trim() || undefined,
  });

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    console.error(`[Config] Invalid environment variables: ${errors}`);
    process.exit(1);
  }

  return parsed.data;
}
