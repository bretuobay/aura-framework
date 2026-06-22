import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    tsconfig: "tsconfig.build.json",
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  splitting: false,
  clean: true,
  external: ["react", "react-dom", "@aura/sdk", "@aura/protocol"],
});
