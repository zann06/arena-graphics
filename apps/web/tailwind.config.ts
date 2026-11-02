import { defineConfig } from '@tailwindcss/node';

export default defineConfig({
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/shared/src/**/*.{ts,tsx}',
    '../../packages/graphics-core/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        cyan: 'var(--color-cyan)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
});
