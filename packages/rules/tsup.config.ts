import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  dts: {
    tsconfig: './tsconfig.build.json',
  },
  clean: true,
  sourcemap: true,
});
