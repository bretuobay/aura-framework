# Implementation Plan: Monorepo Setup

## Overview

This implementation plan scaffolds the AURA TypeScript monorepo using Turborepo, pnpm workspaces, TypeScript project references, Vitest, and per-package build tooling (tsup/Vite). Tasks progress from root configuration through individual package scaffolding, ending with validation. The dependency graph ensures @aura/protocol is built first as the foundation for all other packages.

## Tasks

- [x] 1. Create root monorepo configuration files
  - [x] 1.1 Create `pnpm-workspace.yaml` at workspace root declaring `packages: ["packages/*"]`
    - _Requirements: 1.3_
  - [x] 1.2 Create root `package.json` with name `"aura-monorepo"`, `private: true`, `packageManager` field for pnpm, shared devDependencies (turbo ^2.5.0, typescript ^5.8.3, vitest ^3.2.1, fast-check ^4.1.1, eslint ^9.28.0), and scripts (`build`, `test`, `lint`, `typecheck`, `dev`) that invoke turbo
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 14.1, 14.2, 14.3, 14.4_
  - [x] 1.3 Create `turbo.json` with task pipelines: `build` (dependsOn: `^build`, outputs: `dist/**`), `test` (dependsOn: `build`), `lint` (no deps), `typecheck` (dependsOn: `^build`), `dev` (persistent, no cache)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 1.4 Create `.npmrc` with `shamefully-hoist=false` and `strict-peer-dependencies=true`
    - _Requirements: 1.3_

- [x] 2. Create root TypeScript configuration
  - [x] 2.1 Create root `tsconfig.json` with compilerOptions: strict true, target ES2022, module ESNext, moduleResolution bundler, declaration true, declarationMap true, sourceMap true, composite true, skipLibCheck true, esModuleInterop true, forceConsistentCasingInFileNames true, isolatedModules true, resolveJsonModule true
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 2.2 Add `references` array to root tsconfig pointing to all six packages: packages/protocol, packages/sdk, packages/react, packages/server, packages/rules, packages/devtools
    - _Requirements: 3.5_

- [x] 3. Create Vitest workspace configuration
  - [x] 3.1 Create `vitest.workspace.ts` at workspace root using `defineWorkspace` from `vitest/config` listing all six package directories
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Scaffold @aura/protocol package
  - [x] 4.1 Create `packages/protocol/package.json` with name `@aura/protocol`, version `0.0.0`, type `module`, exports (import/require/types), main, module, types, files, scripts (build: tsup, test: vitest run, typecheck: tsc --noEmit, dev: tsup --watch), dependencies (zod ^3.25.1), devDependencies (tsup ^8.5.0)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 13.1, 13.3, 13.4, 14.6, 14.7_
  - [x] 4.2 Create `packages/protocol/tsconfig.json` extending root tsconfig with compilerOptions (outDir: ./dist, rootDir: ./src), include: ["src"], references: [] (no internal deps)
    - _Requirements: 3.6, 11.1_
  - [x] 4.3 Create `packages/protocol/tsup.config.ts` with entry `src/index.ts`, format `['cjs', 'esm']`, dts true, clean true, sourcemap true
    - _Requirements: 5.6_
  - [x] 4.4 Create `packages/protocol/vitest.config.ts` with globals true
    - _Requirements: 4.4_
  - [x] 4.5 Create `packages/protocol/src/index.ts` with placeholder export
    - _Requirements: 5.7_

- [x] 5. Scaffold @aura/sdk package
  - [x] 5.1 Create `packages/sdk/package.json` with name `@aura/sdk`, version `0.0.0`, type `module`, exports (import/types), module, types, files, scripts (build: vite build && tsc --emitDeclarationOnly, test: vitest run, typecheck: tsc --noEmit, dev: vite build --watch), dependencies (@aura/protocol: workspace:*), devDependencies (vite ^6.3.5)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 11.2, 13.2, 13.3, 13.4, 14.5_
  - [x] 5.2 Create `packages/sdk/tsconfig.json` extending root tsconfig with compilerOptions (outDir: ./dist, rootDir: ./src), include: ["src"], references: [{ path: "../protocol" }]
    - _Requirements: 3.6, 6.7_
  - [x] 5.3 Create `packages/sdk/vite.config.ts` with library mode (entry: src/index.ts, formats: ['es']), external: ['@aura/protocol']
    - _Requirements: 6.5_
  - [x] 5.4 Create `packages/sdk/vitest.config.ts` with globals true
    - _Requirements: 4.4_
  - [x] 5.5 Create `packages/sdk/src/index.ts` with placeholder export
    - _Requirements: 6.6_

- [x] 6. Scaffold @aura/react package
  - [x] 6.1 Create `packages/react/package.json` with name `@aura/react`, version `0.0.0`, type `module`, exports (import/types), module, types, files, scripts, dependencies (@aura/protocol: workspace:*, @aura/sdk: workspace:*), peerDependencies (react ^18.0.0 || ^19.0.0, react-dom ^18.0.0 || ^19.0.0), devDependencies (@vitejs/plugin-react ^4.4.1, vite ^6.3.5, react ^19.1.0, react-dom ^19.1.0, @types/react ^19.1.6, @types/react-dom ^19.1.6)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 11.3, 13.2, 13.3, 13.4, 14.5_
  - [x] 6.2 Create `packages/react/tsconfig.json` extending root tsconfig with compilerOptions (outDir: ./dist, rootDir: ./src, jsx: react-jsx), include: ["src"], references: [{ path: "../protocol" }, { path: "../sdk" }]
    - _Requirements: 3.6, 7.7_
  - [x] 6.3 Create `packages/react/vite.config.ts` with React plugin, library mode (entry: src/index.ts, formats: ['es']), external: ['react', 'react-dom', '@aura/protocol', '@aura/sdk']
    - _Requirements: 7.5_
  - [x] 6.4 Create `packages/react/vitest.config.ts` with globals true, environment jsdom
    - _Requirements: 4.4_
  - [x] 6.5 Create `packages/react/src/index.ts` with placeholder export
    - _Requirements: 7.6_

- [x] 7. Scaffold @aura/server package
  - [x] 7.1 Create `packages/server/package.json` with name `@aura/server`, version `0.0.0`, type `module`, exports (import/types), module, types, files, scripts (build: tsup, test: vitest run, typecheck: tsc --noEmit, dev: tsup --watch), dependencies (@aura/protocol: workspace:*, hono ^4.7.10), devDependencies (tsup ^8.5.0)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.4, 13.2, 13.3, 13.4, 14.6, 14.8_
  - [x] 7.2 Create `packages/server/tsconfig.json` extending root tsconfig with compilerOptions (outDir: ./dist, rootDir: ./src), include: ["src"], references: [{ path: "../protocol" }]
    - _Requirements: 3.6, 8.8_
  - [x] 7.3 Create `packages/server/tsup.config.ts` with entry `src/index.ts`, format `['esm']`, dts true, clean true, sourcemap true
    - _Requirements: 8.6_
  - [x] 7.4 Create `packages/server/vitest.config.ts` with globals true
    - _Requirements: 4.4_
  - [x] 7.5 Create `packages/server/src/index.ts` with placeholder export
    - _Requirements: 8.7_

- [x] 8. Scaffold @aura/rules package
  - [x] 8.1 Create `packages/rules/package.json` with name `@aura/rules`, version `0.0.0`, type `module`, exports (import/types), module, types, files, scripts (build: tsup, test: vitest run, typecheck: tsc --noEmit, dev: tsup --watch), dependencies (@aura/protocol: workspace:*), devDependencies (tsup ^8.5.0)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 11.5, 13.2, 13.3, 13.4, 14.6_
  - [x] 8.2 Create `packages/rules/tsconfig.json` extending root tsconfig with compilerOptions (outDir: ./dist, rootDir: ./src), include: ["src"], references: [{ path: "../protocol" }]
    - _Requirements: 3.6, 9.7_
  - [x] 8.3 Create `packages/rules/tsup.config.ts` with entry `src/index.ts`, format `['esm']`, dts true, clean true, sourcemap true
    - _Requirements: 9.5_
  - [x] 8.4 Create `packages/rules/vitest.config.ts` with globals true
    - _Requirements: 4.4_
  - [x] 8.5 Create `packages/rules/src/index.ts` with placeholder export
    - _Requirements: 9.6_

- [x] 9. Scaffold @aura/devtools package
  - [x] 9.1 Create `packages/devtools/package.json` with name `@aura/devtools`, version `0.0.0`, type `module`, exports (import/types), module, types, files, scripts, dependencies (@aura/protocol: workspace:*), peerDependencies (react ^18.0.0 || ^19.0.0, react-dom ^18.0.0 || ^19.0.0), devDependencies (@vitejs/plugin-react ^4.4.1, vite ^6.3.5, react ^19.1.0, react-dom ^19.1.0, @types/react ^19.1.6, @types/react-dom ^19.1.6)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.6, 13.2, 13.3, 13.4, 14.5_
  - [x] 9.2 Create `packages/devtools/tsconfig.json` extending root tsconfig with compilerOptions (outDir: ./dist, rootDir: ./src, jsx: react-jsx), include: ["src"], references: [{ path: "../protocol" }]
    - _Requirements: 3.6, 10.7_
  - [x] 9.3 Create `packages/devtools/vite.config.ts` with React plugin, library mode (entry: src/index.ts, formats: ['es']), external: ['react', 'react-dom', '@aura/protocol']
    - _Requirements: 10.5_
  - [x] 9.4 Create `packages/devtools/vitest.config.ts` with globals true, environment jsdom
    - _Requirements: 4.4_
  - [x] 9.5 Create `packages/devtools/src/index.ts` with placeholder export
    - _Requirements: 10.6_

- [x] 10. Validate monorepo setup
  - [x] 10.1 Run `pnpm install` at workspace root and verify it completes without errors
    - _Requirements: 1.3, 11.7_
  - [x] 10.2 Run `pnpm typecheck` at workspace root and verify all packages pass type checking
    - _Requirements: 12.4_
  - [x] 10.3 Run `pnpm build` at workspace root and verify all packages produce `dist/` output in correct dependency order
    - _Requirements: 11.7, 12.1_
  - [x] 10.4 Run `pnpm test` at workspace root and verify Vitest executes across all packages (even if no tests exist yet, it should not error)
    - _Requirements: 12.2_

- [x] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The design uses TypeScript throughout — all configuration and placeholder files use TypeScript
- Each task builds incrementally: root config → TypeScript config → Vitest config → packages in dependency order → validation
- @aura/protocol must be scaffolded first as all other packages depend on it
- Packages using tsup (protocol, server, rules) produce declarations via tsup's `dts` option
- Packages using Vite (sdk, react, devtools) produce declarations via a separate `tsc --emitDeclarationOnly` step
- The validation task (10) should be run after all packages are scaffolded to confirm the full dependency graph works
- Property-based tests using fast-check are available to all packages via root devDependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "7.1", "7.2", "7.3", "7.4", "7.5", "8.1", "8.2", "8.3", "8.4", "8.5", "9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 5, "tasks": ["10.1"] },
    { "id": 6, "tasks": ["10.2", "10.3", "10.4"] }
  ]
}
```
