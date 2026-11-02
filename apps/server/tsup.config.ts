import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  target: 'node20',
  // Workspace packages are TypeScript source with .js-style specifiers in their
  // exports map. Bundle them instead of resolving at runtime (avoids .js.js).
  noExternal: [/^@arena\//],
});
