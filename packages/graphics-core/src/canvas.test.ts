import { describe, it, expect } from 'vitest';
import { calculateScale, calculateOffset, canvasToViewport, viewportToCanvas } from './canvas.js';

describe('canvas', () => {
  describe('calculateScale', () => {
    it('returns 1 for exact 1920×1080 viewport', () => {
      const scale = calculateScale(1920, 1080);
      expect(scale).toBe(1);
    });

    it('scales down for larger viewport', () => {
      const scale = calculateScale(3840, 2160); // 4K
      expect(scale).toBe(2);
    });

    it('scales to fit width for ultrawide', () => {
      // 3440×1440 ultrawide: scaleX=1.79, scaleY=1.33 → min=1.33
      const scale = calculateScale(3440, 1440);
      expect(scale).toBeCloseTo(1.33, 2);
    });

    it('scales to fit height for vertical viewport', () => {
      // 1080×1920 portrait: scaleX=0.56, scaleY=1.78 → min=0.56
      const scale = calculateScale(1080, 1920);
      expect(scale).toBeCloseTo(0.56, 2);
    });

    it('returns 1 for zero or negative dimensions', () => {
      expect(calculateScale(0, 1080)).toBe(1);
      expect(calculateScale(1920, 0)).toBe(1);
      expect(calculateScale(-100, 1080)).toBe(1);
    });
  });

  describe('calculateOffset', () => {
    it('centers for exact 1920×1080 viewport', () => {
      const offset = calculateOffset(1920, 1080, 1);
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('centers for 2× scale (4K)', () => {
      const offset = calculateOffset(3840, 2160, 2);
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('calculates horizontal center for ultrawide', () => {
      // 3440×1440 ultrawide with scale 1.333
      // scaledWidth = 1920 × 1.333 = 2559.36
      // scaledHeight = 1080 × 1.333 = 1439.64
      // offsetX = (3440 - 2559.36) / 2 = 440.32
      // offsetY = (1440 - 1439.64) / 2 = 0.18
      const offset = calculateOffset(3440, 1440, 1.333);
      expect(offset.x).toBeCloseTo(440.32, 0);
      expect(offset.y).toBeCloseTo(0.18, 2);
    });
  });

  describe('canvasToViewport', () => {
    it('maps (0,0) to top-left corner', () => {
      const { x, y } = canvasToViewport(0, 0, 1920, 1080);
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it('maps (1920,1080) to bottom-right corner', () => {
      const { x, y } = canvasToViewport(1920, 1080, 1920, 1080);
      expect(x).toBe(1920);
      expect(y).toBe(1080);
    });
  });

  describe('viewportToCanvas', () => {
    it('maps (0,0) to canvas (0,0)', () => {
      const { x, y } = viewportToCanvas(0, 0, 1920, 1080);
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it('maps (1920,1080) to canvas (1920,1080)', () => {
      const { x, y } = viewportToCanvas(1920, 1080, 1920, 1080);
      expect(x).toBe(1920);
      expect(y).toBe(1080);
    });
  });
});
