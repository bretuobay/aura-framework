import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: [
      'src/__tests__/unit/**/*.test.ts',
      'src/__tests__/properties/**/*.property.test.ts',
      'src/__tests__/integration/**/*.test.ts',
    ],
  },
});
