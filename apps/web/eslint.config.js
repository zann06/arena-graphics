// This package-local config simply re-exports the monorepo root ESLint config so
// there is a single source of truth. ESLint 10 auto-loads the nearest config; by
// delegating here, `pnpm lint` (root) and `pnpm --filter @arena/web lint` behave
// identically.
export { default } from '../../eslint.config.js';
