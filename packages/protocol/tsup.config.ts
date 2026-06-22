import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  tsconfig: "tsconfig.build.json",
  dts: {
    tsconfig: "tsconfig.build.json",
  },
  clean: true,
  splitting: false,
});
