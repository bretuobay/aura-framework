import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@aura/protocol",
    "@aura/sdk",
    "@aura/react",
    "@aura/server",
    "@aura/rules",
    "@aura/devtools",
  ],
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@aura/protocol": path.join(repoRoot, "packages/protocol/src/index.ts"),
      "@aura/sdk": path.join(repoRoot, "packages/sdk/src/index.ts"),
      "@aura/react": path.join(repoRoot, "packages/react/src/index.ts"),
      "@aura/server": path.join(repoRoot, "packages/server/src/index.ts"),
      "@aura/rules": path.join(repoRoot, "packages/rules/src/index.ts"),
      "@aura/devtools": path.join(repoRoot, "packages/devtools/src/index.ts"),
    };
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
