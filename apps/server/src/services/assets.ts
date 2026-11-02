/**
 * Local asset storage for uploads (team logos, player photos, hero portraits,
 * sponsors, backgrounds).
 *
 * Files live under `<dataDir>/assets/<kind>/` where `<dataDir>` is ARENA_DATA_DIR
 * or `<workspace>/data`. Only the relative `assets/<kind>/<storedName>` path is
 * stored in the database, and it is served read-only at `/uploads/...`.
 *
 * Safety:
 *  - accepted types are a fixed allow-list (PNG/JPEG/WebP/GIF/SVG),
 *  - size is capped,
 *  - filenames are generated from a random id + sanitized extension (never the
 *    raw client name), preventing traversal and collisions,
 *  - image dimensions are read from the file header (no dependency).
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEnv } from '../config/env.js';
import { ASSET_KINDS, type AssetKind } from '@arena/shared/types/templates.js';

export const MAX_ASSET_BYTES = 8 * 1024 * 1024; // 8 MB

/** Allowed MIME → canonical extension. */
const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

// Resolve the repository root by walking up from this module until we find the
// pnpm workspace marker. This is stable whether the server runs from `src` via
// tsx (src/services/assets.ts) or from the bundled single-file `dist/index.js`.
function findWorkspaceRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const root = findWorkspaceRoot();

export function assetsRoot(): string {
  const configured = validateEnv().dataDir;
  const base = configured ? resolve(configured) : join(root, 'data');
  return join(base, 'assets');
}

/** Create the asset root (and each kind subdirectory) if missing. */
export function ensureAssetsRoot(): string {
  const dir = assetsRoot();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function isAssetKind(value: string): value is AssetKind {
  return (ASSET_KINDS as readonly string[]).includes(value);
}

export function isAllowedMime(mime: string): boolean {
  return mime in MIME_EXT;
}

export function ensureKindDir(kind: AssetKind): string {
  const dir = join(assetsRoot(), kind);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Deterministic, collision-free stored name. Extension comes from the MIME. */
export function buildStoredName(mimeType: string): string {
  const ext = MIME_EXT[mimeType] ?? extname(mimeType) ?? '';
  return `${Date.now()}-${randomUUID()}${ext}`;
}

/** Public URL served by the static `/uploads` mount. */
export function publicUrl(kind: AssetKind, storedName: string): string {
  return `/uploads/${kind}/${storedName}`;
}

export interface WriteResult {
  storedName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  url: string;
}

export function writeAsset(kind: AssetKind, mimeType: string, buffer: Buffer): WriteResult {
  const dir = ensureKindDir(kind);
  const storedName = buildStoredName(mimeType);
  const filePath = join(dir, storedName);
  writeFileSync(filePath, buffer);
  const dims = readImageDimensions(filePath, mimeType);
  return {
    storedName,
    sizeBytes: statSync(filePath).size,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    url: publicUrl(kind, storedName),
  };
}

export function deleteAssetFile(kind: AssetKind, storedName: string): void {
  // Guard against traversal: a stored name must be a bare filename.
  if (storedName.includes('/') || storedName.includes('\\') || storedName.includes('..')) return;
  const filePath = join(assetsRoot(), kind, storedName);
  try {
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch {
    /* best-effort cleanup */
  }
}

/**
 * Read image dimensions from the file header. Supports PNG, JPEG, GIF, and WebP.
 * Returns null for SVG or unrecognized formats.
 */
export function readImageDimensions(
  filePath: string,
  mimeType?: string
): { width: number; height: number } | null {
  try {
    const head = readFileSync(filePath).subarray(0, 64 * 1024);
    return parseImageDimensions(head, mimeType);
  } catch {
    return null;
  }
}

export function parseImageDimensions(buf: Buffer, mimeType?: string): { width: number; height: number } | null {
  if (buf.length < 10) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A, IHDR at offset 16 (big-endian w/h).
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }

  // GIF: 'GIF87a'/'GIF89a', logical screen size little-endian at 6.
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: 'RIFF'....'WEBP'.
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const format = buf.toString('ascii', 12, 16);
    if (format === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (format === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (format === 'VP8X') {
      const width = 1 + ((buf[24] ?? 0) | ((buf[25] ?? 0) << 8) | ((buf[26] ?? 0) << 16));
      const height = 1 + ((buf[27] ?? 0) | ((buf[28] ?? 0) << 8) | ((buf[29] ?? 0) << 16));
      return { width, height };
    }
    return null;
  }

  // JPEG: scan segments for a Start-Of-Frame marker.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buf[offset + 1];
      // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC).
      if (marker === undefined) break;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { width, height };
      }
      const segLength = buf.readUInt16BE(offset + 2);
      offset += 2 + segLength;
    }
    return null;
  }

  // SVG dimensions are declared as attributes; not parsed here.
  if (mimeType === 'image/svg+xml' || buf.toString('utf8', 0, 200).includes('<svg')) {
    return null;
  }

  return null;
}
