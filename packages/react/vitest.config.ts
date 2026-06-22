import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['__tests__/properties/**/*.test.ts', '__tests__/unit/**/*.test.{ts,tsx}'],
  },
});
