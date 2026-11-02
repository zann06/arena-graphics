import { ANIMATION } from '@arena/shared/constants/canvas.js';

/**
 * Animation timing helpers for Phase 1 graphics
 */
export interface AnimationState {
  status: 'idle' | 'entering' | 'visible' | 'exiting';
  progress: number; // 0-1
}

/**
 * Generate enter/exit animation keyframes for CSS
 */
export function createOpacityAnimation() {
  return {
    entering: {
      animation: `fadeIn ${ANIMATION.duration.slow}ms ${ANIMATION.easing.easeOut}`,
    },
    visible: {
      animation: 'none',
    },
    exiting: {
      animation: `fadeOut ${ANIMATION.duration.fast}ms ${ANIMATION.easing.easeIn}`,
    },
  };
}

/**
 * Easing functions
 */
export const EASING = {
  easeInOut: ANIMATION.easing.easeInOut,
  easeOut: ANIMATION.easing.easeOut,
  easeIn: ANIMATION.easing.easeIn,
};

/**
 * Calculate animation progress (0-1) based on elapsed time and duration
 */
export function calculateProgress(elapsed: number, duration: number, ease: string = EASING.easeInOut): number {
  if (elapsed >= duration) return 1;
  const t = elapsed / duration;
  // Simple easing implementation (could be expanded with full Bezier)
  switch (ease) {
    case EASING.easeOut:
      return 1 - Math.pow(1 - t, 3);
    case EASING.easeIn:
      return Math.pow(t, 3);
    case EASING.easeInOut:
    default:
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
