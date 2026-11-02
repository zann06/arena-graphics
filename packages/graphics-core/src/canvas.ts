import { CANVAS } from '@arena/shared/constants/canvas.js';

/**
 * Calculate scale factor to fit the 1920×1080 logical canvas into a viewport.
 * Returns a scale that preserves aspect ratio and centers the stage.
 */
export function calculateScale(viewportWidth: number, viewportHeight: number): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return 1;
  }
  const scaleX = viewportWidth / CANVAS.width;
  const scaleY = viewportHeight / CANVAS.height;
  return Math.min(scaleX, scaleY);
}

/**
 * Calculate centered offset to position the scaled 1920×1080 canvas.
 */
export function calculateOffset(viewportWidth: number, viewportHeight: number, scale: number): { x: number; y: number } {
  const scaledWidth = CANVAS.width * scale;
  const scaledHeight = CANVAS.height * scale;
  return {
    x: (viewportWidth - scaledWidth) / 2,
    y: (viewportHeight - scaledHeight) / 2,
  };
}

/**
 * Convert canvas coordinates (0-1920, 0-1080) to viewport coordinates.
 */
export function canvasToViewport(x: number, y: number, viewportWidth: number, viewportHeight: number): { x: number; y: number } {
  const scale = calculateScale(viewportWidth, viewportHeight);
  const offset = calculateOffset(viewportWidth, viewportHeight, scale);
  return {
    x: offset.x + x * scale,
    y: offset.y + y * scale,
  };
}

/**
 * Convert viewport coordinates to canvas coordinates (0-1920, 0-1080).
 */
export function viewportToCanvas(x: number, y: number, viewportWidth: number, viewportHeight: number): { x: number; y: number } {
  const scale = calculateScale(viewportWidth, viewportHeight);
  const offset = calculateOffset(viewportWidth, viewportHeight, scale);
  return {
    x: (x - offset.x) / scale,
    y: (y - offset.y) / scale,
  };
}
