import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts', 'src/__tests__/**/*.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**'],
    },
  },
});
