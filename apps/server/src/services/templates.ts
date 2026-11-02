import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { graphicsTemplates } from '../db/schema.js';
import {
  DEFAULT_TEMPLATE_THEME,
  TEMPLATE_TYPES,
  type TemplateRecord,
  type TemplateTheme,
} from '@arena/shared/types/templates.js';
import type { GraphicKey } from '@arena/shared/types/realtime.js';

function parseTheme(json: string): TemplateTheme {
  try {
    const parsed = JSON.parse(json) as Partial<TemplateTheme>;
    return { ...DEFAULT_TEMPLATE_THEME, ...parsed };
  } catch {
    return { ...DEFAULT_TEMPLATE_THEME };
  }
}

function toRecord(row: typeof graphicsTemplates.$inferSelect): TemplateRecord {
  return {
    id: row.id,
    name: row.name,
    templateType: row.templateType as GraphicKey,
    theme: parseTheme(row.configurationJson),
    isActive: row.isActive === 1,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export function isTemplateType(value: string): value is GraphicKey {
  return (TEMPLATE_TYPES as readonly string[]).includes(value);
}

export async function listTemplates(): Promise<TemplateRecord[]> {
  const rows = await db.select().from(graphicsTemplates).orderBy(desc(graphicsTemplates.id));
  return rows.map(toRecord);
}

export async function listActiveTemplates(): Promise<TemplateRecord[]> {
  const rows = await db.select().from(graphicsTemplates).where(eq(graphicsTemplates.isActive, 1));
  return rows.map(toRecord);
}

export async function getTemplate(id: number): Promise<TemplateRecord | null> {
  const rows = await db.select().from(graphicsTemplates).where(eq(graphicsTemplates.id, id));
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function createTemplate(input: {
  name: string;
  templateType: GraphicKey;
  theme: TemplateTheme;
  activate?: boolean;
}): Promise<TemplateRecord> {
  const now = new Date();
  if (input.activate) await deactivateType(input.templateType);
  const inserted = await db
    .insert(graphicsTemplates)
    .values({
      name: input.name,
      templateType: input.templateType,
      configurationJson: JSON.stringify(input.theme),
      isActive: input.activate ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return toRecord(inserted[0]);
}

export async function updateTemplate(
  id: number,
  input: { name?: string; templateType?: GraphicKey; theme?: TemplateTheme }
): Promise<TemplateRecord | null> {
  const current = await getTemplate(id);
  if (!current) return null;
  const updated = await db
    .update(graphicsTemplates)
    .set({
      name: input.name ?? current.name,
      templateType: input.templateType ?? current.templateType,
      configurationJson: JSON.stringify(input.theme ?? current.theme),
      updatedAt: new Date(),
    })
    .where(eq(graphicsTemplates.id, id))
    .returning();
  return toRecord(updated[0]);
}

/** Activate a template (deactivates any other of the same graphic type). */
export async function activateTemplate(id: number): Promise<TemplateRecord | null> {
  const current = await getTemplate(id);
  if (!current) return null;
  await deactivateType(current.templateType);
  const updated = await db
    .update(graphicsTemplates)
    .set({ isActive: 1, updatedAt: new Date() })
    .where(eq(graphicsTemplates.id, id))
    .returning();
  return toRecord(updated[0]);
}

async function deactivateType(templateType: GraphicKey): Promise<void> {
  await db
    .update(graphicsTemplates)
    .set({ isActive: 0 })
    .where(eq(graphicsTemplates.templateType, templateType));
}

/** Duplicate a template as a new inactive copy. */
export async function duplicateTemplate(id: number): Promise<TemplateRecord | null> {
  const current = await getTemplate(id);
  if (!current) return null;
  return createTemplate({
    name: `${current.name} (copy)`,
    templateType: current.templateType,
    theme: current.theme,
    activate: false,
  });
}

/** Reset a template's theme to defaults (keeps name/type, does not activate). */
export async function resetTemplate(id: number): Promise<TemplateRecord | null> {
  const current = await getTemplate(id);
  if (!current) return null;
  const updated = await db
    .update(graphicsTemplates)
    .set({ configurationJson: JSON.stringify(DEFAULT_TEMPLATE_THEME), updatedAt: new Date() })
    .where(eq(graphicsTemplates.id, id))
    .returning();
  return toRecord(updated[0]);
}

export async function deleteTemplate(id: number): Promise<boolean> {
  const current = await getTemplate(id);
  if (!current) return false;
  await db.delete(graphicsTemplates).where(eq(graphicsTemplates.id, id));
  return true;
}

/** Map of GraphicKey → active theme, used by the realtime state for overlays. */
export async function activeThemeMap(): Promise<Partial<Record<GraphicKey, TemplateTheme>>> {
  const active = await listActiveTemplates();
  const map: Partial<Record<GraphicKey, TemplateTheme>> = {};
  for (const t of active) map[t.templateType] = t.theme;
  return map;
}

/** Seed one default template per graphic type if none exist. */
export async function seedDefaultTemplates(): Promise<void> {
  const existing = await db.select({ id: graphicsTemplates.id }).from(graphicsTemplates);
  if (existing.length > 0) return;
  for (const type of TEMPLATE_TYPES) {
    await createTemplate({
      name: `Default ${type}`,
      templateType: type as GraphicKey,
      theme: DEFAULT_TEMPLATE_THEME,
      activate: true,
    });
  }
}
