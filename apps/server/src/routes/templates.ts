import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DISPLAY_FONTS, TEMPLATE_TYPES, type TemplateTheme } from '@arena/shared/types/templates.js';
import type { GraphicKey } from '@arena/shared/types/realtime.js';
import {
  activateTemplate,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  resetTemplate,
  updateTemplate,
} from '../services/templates.js';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #RRGGBB color');
const templateType = z.enum(TEMPLATE_TYPES as unknown as [GraphicKey, ...GraphicKey[]]);
const displayFont = z.enum(DISPLAY_FONTS) as unknown as z.ZodType<TemplateTheme['displayFont']>;

const themeSchema = z.object({
  accentColor: hexColor,
  panelColor: hexColor,
  textColor: hexColor,
  displayFont,
  scale: z.number().min(0.8).max(1.2),
  radius: z.number().int().min(0).max(64),
  showAccentBar: z.boolean(),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  templateType,
  theme: themeSchema,
  activate: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  templateType: templateType.optional(),
  theme: themeSchema.optional(),
});

export async function listTemplatesHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    return res.code(200).send(await listTemplates());
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to list templates', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function getTemplateHandler(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.code(400).send({ error: 'Invalid template ID' });
  try {
    const t = await getTemplate(id);
    if (!t) return res.code(404).send({ error: 'Template not found' });
    return res.code(200).send(t);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to get template', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function createTemplateHandler(req: FastifyRequest, res: FastifyReply) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
  try {
    const t = await createTemplate(parsed.data);
    return res.code(201).send(t);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to create template', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function updateTemplateHandler(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.code(400).send({ error: 'Invalid template ID' });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.code(400).send({ error: 'Validation failed', details: parsed.error.issues });
  try {
    const t = await updateTemplate(id, parsed.data);
    if (!t) return res.code(404).send({ error: 'Template not found' });
    return res.code(200).send(t);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to update template', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function activateTemplateHandler(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.code(400).send({ error: 'Invalid template ID' });
  try {
    const t = await activateTemplate(id);
    if (!t) return res.code(404).send({ error: 'Template not found' });
    return res.code(200).send(t);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to activate template', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function duplicateTemplateHandler(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.code(400).send({ error: 'Invalid template ID' });
  try {
    const t = await duplicateTemplate(id);
    if (!t) return res.code(404).send({ error: 'Template not found' });
    return res.code(201).send(t);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to duplicate template', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function resetTemplateHandler(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.code(400).send({ error: 'Invalid template ID' });
  try {
    const t = await resetTemplate(id);
    if (!t) return res.code(404).send({ error: 'Template not found' });
    return res.code(200).send(t);
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to reset template', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function deleteTemplateHandler(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.code(400).send({ error: 'Invalid template ID' });
  try {
    const ok = await deleteTemplate(id);
    if (!ok) return res.code(404).send({ error: 'Template not found' });
    return res.code(200).send({ message: 'Template deleted' });
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to delete template', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}
