import { describe, it, expect } from 'vitest';
import { ANIMATION } from '@arena/shared/constants/canvas.js';
import { createOpacityAnimation, EASING, calculateProgress, clamp } from './animations.js';

describe('animations', () => {
  describe('createOpacityAnimation', () => {
    it('returns correct animations for each state', () => {
      const animations = createOpacityAnimation();

      expect(animations.entering.animation).toMatch(/fadeIn/);
      expect(animations.visible.animation).toBe('none');
      expect(animations.exiting.animation).toMatch(/fadeOut/);
    });
  });

  describe('EASING', () => {
    it('matches constants from canvas', () => {
      expect(EASING.easeInOut).toBe(ANIMATION.easing.easeInOut);
      expect(EASING.easeOut).toBe(ANIMATION.easing.easeOut);
      expect(EASING.easeIn).toBe(ANIMATION.easing.easeIn);
    });
  });

  describe('calculateProgress', () => {
    it('returns 0 for elapsed=0', () => {
      expect(calculateProgress(0, 1000)).toBe(0);
    });

    it('returns 1 for elapsed >= duration', () => {
      expect(calculateProgress(1000, 1000)).toBe(1);
      expect(calculateProgress(1500, 1000)).toBe(1);
    });

    it('returns 0.5 for halfway with easeInOut', () => {
      // At t=0.5, easeInOut returns 0.5
      const progress = calculateProgress(500, 1000, EASING.easeInOut);
      expect(progress).toBe(0.5);
    });

    it('applies easeOut curve correctly', () => {
      // At t=0.5, easeOut returns 1 - (0.5)^3 = 0.875
      const progress = calculateProgress(500, 1000, EASING.easeOut);
      expect(progress).toBeCloseTo(0.875, 3);
    });

    it('applies easeIn curve correctly', () => {
      // At t=0.5, easeIn returns (0.5)^3 = 0.125
      const progress = calculateProgress(500, 1000, EASING.easeIn);
      expect(progress).toBeCloseTo(0.125, 3);
    });
  });

  describe('clamp', () => {
    it('returns min when value < min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('returns max when value > max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('returns value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });
  });
});
