/**
 * ARENA GRAPHICS — Canvas constants
 * 
 * All overlays render on a fixed logical 1920×1080 canvas.
 * The HTML document background must be transparent.
 * Scale is determined by min(viewportWidth / 1920, viewportHeight / 1080).
 */

export const CANVAS = {
  width: 1920,
  height: 1080,
  aspect: 16 / 9,
};

export const LAYOUT = {
  safeAreaPadding: 40,
  padding: 24,
  spacing: 16,
  borderRadius: 8,
};

export const TYPOGRAPHY = {
  display: {
    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
    fontWeight: '700',
    lineHeight: '1.1',
  },
  body: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: '400',
    lineHeight: '1.5',
  },
  monospace: {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontWeight: '400',
    lineHeight: '1.4',
  },
};

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  },
};
