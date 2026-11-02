import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { heroes } from '../db/schema.js';

const createHeroSchema = z.object({
  name: z.string().min(1).max(60),
  portraitPath: z.string().max(500).optional().nullable(),
});

const importHeroesSchema = z.object({
  names: z.array(z.string().min(1).max(60)).min(1).max(200),
});

const updateHeroSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  portraitPath: z.string().max(500).optional().nullable(),
});

function validationError(res: FastifyReply, err: z.ZodError) {
  return res.code(400).send({ error: 'Validation failed', details: err.issues });
}

export async function createHero(req: FastifyRequest, res: FastifyReply) {
  const parsed = createHeroSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const now = new Date();
  const rows = await db
    .insert(heroes)
    .values({
      name: parsed.data.name.trim(),
      portraitPath: parsed.data.portraitPath ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return res.code(201).send(rows[0]);
}

export async function listHeroes(_req: FastifyRequest, res: FastifyReply) {
  const rows = await db.select().from(heroes);
  return res.code(200).send(rows);
}

export async function updateHero(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.code(400).send({ error: 'Invalid hero ID' });

  const parsed = updateHeroSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const existing = await db.select().from(heroes).where(eq(heroes.id, id));
  if (!existing[0]) return res.code(404).send({ error: 'Hero not found' });

  const rows = await db
    .update(heroes)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.portraitPath !== undefined ? { portraitPath: parsed.data.portraitPath } : {}),
      assetVersion: existing[0].assetVersion + 1,
      updatedAt: new Date(),
    })
    .where(eq(heroes.id, id))
    .returning();
  return res.code(200).send(rows[0]);
}

export async function deleteHero(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.code(400).send({ error: 'Invalid hero ID' });
  await db.delete(heroes).where(eq(heroes.id, id));
  return res.code(200).send({ message: 'Hero deleted' });
}

/**
 * Bulk import hero names. Skips duplicates (case-insensitive) so the operator
 * can paste the same list twice without creating duplicates.
 */
export async function importHeroes(req: FastifyRequest, res: FastifyReply) {
  const parsed = importHeroesSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const existing = (await db.select().from(heroes)) as Array<typeof heroes.$inferSelect>;
  const known = new Set(existing.map((hero) => hero.name.trim().toLowerCase()));
  const now = new Date();
  const inserted: string[] = [];

  for (const raw of parsed.data.names) {
    const name = raw.trim();
    if (!name || known.has(name.toLowerCase())) continue;
    known.add(name.toLowerCase());
    await db.insert(heroes).values({ name, createdAt: now, updatedAt: now });
    inserted.push(name);
  }

  return res.code(201).send({ imported: inserted.length, skipped: parsed.data.names.length - inserted.length, names: inserted });
}
