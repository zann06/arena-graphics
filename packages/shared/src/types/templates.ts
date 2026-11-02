import { GRAPHIC_KEYS, type GraphicKey } from './realtime.js';

/** Uploaded asset categories, matching the data-directory layout. */
export const ASSET_KINDS = ['teams', 'players', 'heroes', 'sponsors', 'backgrounds'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export interface AssetRecord {
  id: number;
  kind: AssetKind;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  url: string;
  createdAt: string;
}

/**
 * Theme configuration for a graphic template. These values are consumed by the
 * overlays so template edits are visible on air (not just stored JSON).
 */
export interface TemplateTheme {
  /** Accent color applied to the graphic frame/bars. */
  accentColor: string;
  /** Panel background color (solid; overlays apply their own alpha). */
  panelColor: string;
  /** Primary text color. */
  textColor: string;
  /** Display font family used for titles/team names. */
  displayFont: 'Barlow Condensed' | 'Inter' | 'Oswald' | 'Rajdhani' | 'Teko';
  /** Base scale multiplier for the graphic (0.8–1.2). */
  scale: number;
  /** Corner radius in px for panels. */
  radius: number;
  /** Whether the overlay shows a subtle top accent bar. */
  showAccentBar: boolean;
}

export interface TemplateRecord {
  id: number;
  name: string;
  templateType: GraphicKey;
  theme: TemplateTheme;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCommand {
  name: string;
  templateType: GraphicKey;
  theme: TemplateTheme;
}

export const DEFAULT_TEMPLATE_THEME: TemplateTheme = {
  accentColor: '#237bff',
  panelColor: '#0d1528',
  textColor: '#ffffff',
  displayFont: 'Barlow Condensed',
  scale: 1,
  radius: 0,
  showAccentBar: true,
};

export const DISPLAY_FONTS = ['Barlow Condensed', 'Inter', 'Oswald', 'Rajdhani', 'Teko'] as const;

export const TEMPLATE_TYPES = GRAPHIC_KEYS;
