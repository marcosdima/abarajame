import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const monorepoSource = resolve(import.meta.dirname, '../../packages/alambre/src/storage/index.ts');
const isMonorepo = existsSync(monorepoSource);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    alias: {
      alambre: isMonorepo
        ? monorepoSource
        : resolve(import.meta.dirname, 'node_modules/alambre/dist/module/storage/index.js'),
    },
  },
});

