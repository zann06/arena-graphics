import type { TemplateTheme } from '@arena/shared/types/templates.js';
import { DEFAULT_TEMPLATE_THEME } from '@arena/shared/types/templates.js';

/**
 * Resolve a graphic's theme, falling back to the default when a template has not
 * been configured for that graphic type. A single resolved object also exposes
 * derived values (panel gradient, alpha variants) so the graphics stay readable.
 */
export interface ResolvedTheme extends TemplateTheme {
  /** Root transform applied to the graphic's container (scale). */
  transform: string;
  /** Panel background gradient derived from panelColor. */
  panelGradient: string;
  /** Slightly lighter panel for nested surfaces. */
  panelGradientSoft: string;
  /** Text color with reduced opacity, for labels. */
  textMuted: string;
  /** Accent at ~35% for glows/borders. */
  accentSoft: string;
}

export function resolveTheme(theme?: TemplateTheme | null): ResolvedTheme {
  const t = { ...DEFAULT_TEMPLATE_THEME, ...(theme ?? {}) };
  return {
    ...t,
    transform: `scale(${t.scale})`,
    panelGradient: `linear-gradient(180deg, ${t.panelColor}, rgba(8,13,25,0.98))`,
    panelGradientSoft: `linear-gradient(160deg, ${hexToRgba(t.accentColor, 0.13)}, ${hexToRgba(t.panelColor, 0.93)} 60%)`,
    textMuted: hexToRgba(t.textColor, 0.55),
    accentSoft: hexToRgba(t.accentColor, 0.33),
  };
}

/** Expand `#rgb`/`#rrggbb` to an `rgba(r,g,b,a)` string. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return `rgba(35,123,255,${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
