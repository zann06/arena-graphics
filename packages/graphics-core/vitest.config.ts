import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@arena/shared': resolve(__dirname, '../../packages/shared/src'),
      '@arena/graphics-core': resolve(__dirname, '../graphics-core/src'),
    },
  },
});
