import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = import.meta.dirname;

// Minimal Node globals for linting plain scripts without pulling in `globals`.
const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  global: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/database/migrations/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/artifacts/**',
      '**/data/**',
      // Ad-hoc scratch/debug files from early spikes (not part of the build).
      'apps/server/test.js',
      'apps/server/test-health.js',
      'apps/server/test-health.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // ESLint 10 needs an explicit resolution root when several tsconfig files
    // exist in the monorepo; without this, type-aware parsing fails.
    languageOptions: { parserOptions: { tsconfigRootDir } },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // Node scripts: provide Node globals and skip type-aware parsing (they are
    // not part of any tsconfig project).
    files: ['**/*.mjs', 'scripts/**/*.{js,ts}', 'apps/web/scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...nodeGlobals },
      parserOptions: { tsconfigRootDir, projectService: false, project: false },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Config files (vite/tailwind/eslint) are plain Node ESM.
    files: ['**/*.config.{js,ts,mjs}'],
    languageOptions: {
      globals: { ...nodeGlobals },
      parserOptions: { tsconfigRootDir, projectService: false, project: false },
    },
  },
  {
    // The server intentionally types dynamic Drizzle/state/OBS payloads as any.
    files: ['apps/server/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
);
