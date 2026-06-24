import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@aura/react": path.resolve(__dirname, "../../packages/react/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    include: [
      "__tests__/**/*.{test,spec}.{ts,tsx}",
      "**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["node_modules", ".next", "__tests__/properties/**"],
  },
});
