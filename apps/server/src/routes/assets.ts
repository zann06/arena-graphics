import type { FastifyRequest, FastifyReply } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { assets } from '../db/schema.js';
import {
  MAX_ASSET_BYTES,
  deleteAssetFile,
  isAllowedMime,
  isAssetKind,
  writeAsset,
} from '../services/assets.js';

function toRecord(row: typeof assets.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    originalName: row.originalName,
    storedName: row.storedName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    url: row.url,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/** GET /api/assets?kind=teams — list uploaded assets, newest first. */
export async function listAssets(req: FastifyRequest, res: FastifyReply) {
  try {
    const { kind } = req.query as { kind?: string };
    const base = db.select().from(assets);
    const rows = kind ? await base.where(eq(assets.kind, kind)).orderBy(desc(assets.id)) : await base.orderBy(desc(assets.id));
    return res.code(200).send(rows.map(toRecord));
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to list assets', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

/**
 * POST /api/assets/upload — multipart form with fields:
 *   field "file"   (required, image)
 *   field "kind"   (required, one of ASSET_KINDS)
 */
export async function uploadAsset(req: FastifyRequest, res: FastifyReply) {
  try {
    if (!req.isMultipart()) {
      return res.code(400).send({ error: 'Expected multipart/form-data' });
    }

    let kind: string | undefined;
    let originalName = 'upload';
    let mimeType = '';
    let buffer: Buffer | null = null;

    for await (const part of req.parts()) {
      if (part.type === 'field') {
        if (part.fieldname === 'kind') kind = String(part.value);
      } else {
        if (part.fieldname !== 'file') {
          // Drain unexpected file parts.
          await part.toBuffer().catch(() => Buffer.alloc(0));
          continue;
        }
        mimeType = part.mimetype;
        originalName = part.filename || 'upload';
        // Enforce size while reading.
        const chunks: Buffer[] = [];
        let total = 0;
        for await (const chunk of part.file) {
          total += chunk.length;
          if (total > MAX_ASSET_BYTES) {
            part.file.resume();
            return res.code(413).send({ error: 'File too large', message: `Max ${MAX_ASSET_BYTES / 1024 / 1024} MB` });
          }
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks);
        if (part.file.truncated) {
          return res.code(413).send({ error: 'File too large', message: `Max ${MAX_ASSET_BYTES / 1024 / 1024} MB` });
        }
      }
    }

    if (!kind || !isAssetKind(kind)) {
      return res.code(400).send({ error: 'Invalid kind', message: `kind must be one of teams, players, heroes, sponsors, backgrounds` });
    }
    if (!buffer || buffer.length === 0) {
      return res.code(400).send({ error: 'No file uploaded' });
    }
    if (!isAllowedMime(mimeType)) {
      return res.code(415).send({ error: 'Unsupported media type', message: `${mimeType} is not allowed (png, jpeg, webp, gif, svg)` });
    }
    // Reject an empty or clearly non-image payload by sniffing the magic bytes
    // for raster formats (SVG is text-based and allowed as-is).
    if (mimeType !== 'image/svg+xml' && buffer.length < 12) {
      return res.code(400).send({ error: 'Invalid image file' });
    }

    const written = writeAsset(kind, mimeType, buffer);
    const now = new Date();
    const inserted = await db
      .insert(assets)
      .values({
        kind,
        originalName,
        storedName: written.storedName,
        mimeType,
        sizeBytes: written.sizeBytes,
        width: written.width,
        height: written.height,
        url: written.url,
        createdAt: now,
      })
      .returning();

    return res.code(201).send(toRecord(inserted[0]));
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Upload failed', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

/** DELETE /api/assets/:id — remove the row and the file. */
export async function deleteAsset(req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.code(400).send({ error: 'Invalid asset ID' });

    const existing = await db.select().from(assets).where(eq(assets.id, id));
    if (existing.length === 0) return res.code(404).send({ error: 'Asset not found' });

    await db.delete(assets).where(eq(assets.id, id));
    deleteAssetFile(existing[0].kind, existing[0].storedName);
    return res.code(200).send({ message: 'Asset deleted' });
  } catch (err) {
    req.log.error(err);
    return res.code(500).send({ error: 'Failed to delete asset', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}
