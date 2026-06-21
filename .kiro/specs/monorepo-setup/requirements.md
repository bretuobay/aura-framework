# Requirements Document

## Introduction

This feature initializes the AURA TypeScript monorepo in the current workspace directory using Turborepo as the build orchestrator, pnpm as the package manager, Vite as the bundler (where applicable), Vitest as the test runner, and TypeScript with strict mode across all packages. The monorepo hosts six internal packages under `packages/*`: `@aura/protocol`, `@aura/sdk`, `@aura/react`, `@aura/server`, `@aura/rules`, and `@aura/devtools`.

The setup must produce a working development environment where `pnpm install` succeeds, `turbo build` compiles all packages respecting the dependency graph, `turbo test` runs Vitest across all packages, and each package can be developed independently with correct TypeScript project references. All packages use Vitest with fast-check for property-based testing.

The monorepo is initialized in the current working directory (the existing research project). No new top-level directory is created; all monorepo infrastructure files and the `packages/` directory are placed at the workspace root.

---

## Glossary

- **Monorepo**: The single repository containing all `@aura/*` packages, managed by Turborepo and pnpm workspaces.
- **Turborepo**: The monorepo build system that orchestrates parallel, cached task execution across workspace packages.
- **pnpm**: The package manager used for dependency resolution, workspace linking, and lockfile management.
- **Workspace**: A pnpm workspace containing all packages under the `packages/*` glob pattern.
- **Root_Package_Json**: The `package.json` at the workspace root that declares workspaces, shared devDependencies, and root-level scripts.
- **Turbo_Config**: The `turbo.json` file at the workspace root that defines task pipelines, caching rules, and dependency relationships between tasks.
- **Root_Tsconfig**: The `tsconfig.json` at the workspace root that defines shared TypeScript compiler options and project references for all packages.
- **Package_Tsconfig**: The `tsconfig.json` within each package that extends the Root_Tsconfig and declares package-specific paths and references.
- **Vitest_Workspace**: The `vitest.workspace.ts` file at the workspace root that configures Vitest to discover and run tests across all packages.
- **Package_Scaffold**: The minimal directory and file structure created for each `@aura/*` package, including `package.json`, `tsconfig.json`, `src/index.ts`, and test configuration.
- **Internal_Dependency**: A dependency between `@aura/*` packages declared using the `workspace:*` protocol in pnpm.
- **Build_Pipeline**: The Turborepo task graph that ensures packages are built in dependency order with correct caching.
- **tsup**: The TypeScript bundler used by `@aura/protocol` to produce dual CJS/ESM builds with declaration files.
- **Vite**: The bundler used by browser-facing packages (`@aura/sdk`, `@aura/react`, `@aura/devtools`) for library builds.
- **fast-check**: The property-based testing library used alongside Vitest in all packages.
- **Project_References**: TypeScript composite project references that enable incremental builds and cross-package type checking.

---

## Requirements

### Requirement 1: Root Package Configuration

**User Story:** As a developer, I want a root `package.json` with pnpm workspace configuration, so that all packages are linked and managed as a single monorepo.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `package.json` at the workspace root with a `name` field set to `"aura-monorepo"` and `private` set to `true`.
2. THE Root_Package_Json SHALL declare a `packageManager` field specifying `pnpm` with a version constraint.
3. THE Monorepo SHALL contain a `pnpm-workspace.yaml` file at the workspace root that declares `packages: ["packages/*"]` as the workspace glob.
4. THE Root_Package_Json SHALL declare shared `devDependencies` for TypeScript, Turborepo, Vitest, fast-check, and ESLint with pinned version numbers.
5. THE Root_Package_Json SHALL declare root-level `scripts` for `build`, `test`, `lint`, `typecheck`, and `dev` that invoke corresponding Turborepo tasks.

### Requirement 2: Turborepo Build Pipeline Configuration

**User Story:** As a developer, I want Turborepo configured with proper task pipelines, so that builds, tests, and checks run in the correct dependency order with caching.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `turbo.json` file at the workspace root.
2. THE Turbo_Config SHALL define a `build` pipeline task that depends on `^build` (topological dependency on upstream package builds) and caches the `dist` output directory.
3. THE Turbo_Config SHALL define a `test` pipeline task that depends on `build` and produces no cached outputs.
4. THE Turbo_Config SHALL define a `lint` pipeline task with no topological dependencies.
5. THE Turbo_Config SHALL define a `typecheck` pipeline task that depends on `^build` (topological dependency on upstream package builds).
6. THE Turbo_Config SHALL define a `dev` pipeline task that is marked as persistent and produces no cached outputs.

### Requirement 3: Root TypeScript Configuration

**User Story:** As a developer, I want a shared root TypeScript configuration with strict settings, so that all packages inherit consistent compiler options and enable incremental cross-package type checking.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `tsconfig.json` at the workspace root that defines shared `compilerOptions` with `strict` set to `true`.
2. THE Root_Tsconfig SHALL set `target` to `"ES2022"` and `module` to `"ESNext"` with `moduleResolution` set to `"bundler"`.
3. THE Root_Tsconfig SHALL enable `declaration`, `declarationMap`, `sourceMap`, and `composite` for project references support.
4. THE Root_Tsconfig SHALL set `skipLibCheck` to `true` and `esModuleInterop` to `true`.
5. THE Root_Tsconfig SHALL declare `references` entries pointing to each of the six packages under `packages/*`.
6. WHEN a package needs to override specific compiler options, THE Package_Tsconfig SHALL extend the Root_Tsconfig using the `extends` field.

### Requirement 4: Vitest Workspace Configuration

**User Story:** As a developer, I want a Vitest workspace configuration, so that running `turbo test` discovers and executes tests across all packages with fast-check available.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `vitest.workspace.ts` file at the workspace root that lists all six package directories.
2. WHEN `vitest` runs within a package, THE Vitest_Workspace SHALL resolve each package's local `vitest.config.ts` for package-specific test settings.
3. THE Root_Package_Json SHALL include `vitest` and `fast-check` as shared root `devDependencies` available to all packages.
4. WHEN a package scaffold is created, THE Package_Scaffold SHALL include a `vitest.config.ts` that configures the test environment appropriate for that package.

### Requirement 5: @aura/protocol Package Scaffold

**User Story:** As a developer, I want the `@aura/protocol` package scaffolded with tsup for dual CJS/ESM builds, so that it serves as the zero-dependency foundation for all other packages.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `packages/protocol` directory with a `package.json` declaring `name` as `"@aura/protocol"`.
2. THE `@aura/protocol` package.json SHALL declare `zod` as a runtime `dependency`.
3. THE `@aura/protocol` package.json SHALL declare `tsup` as a `devDependency` for building dual CJS/ESM outputs.
4. THE `@aura/protocol` package.json SHALL declare `exports` field with `"."` entry pointing to CJS (`./dist/index.cjs`) and ESM (`./dist/index.js`) outputs with a `types` condition pointing to `./dist/index.d.ts`.
5. THE `@aura/protocol` package.json SHALL declare a `build` script that invokes `tsup`.
6. THE Package_Scaffold SHALL include a `tsup.config.ts` that configures dual `cjs` and `esm` format output with declaration generation enabled.
7. THE Package_Scaffold SHALL include a `src/index.ts` placeholder file that exports an empty object or type.
8. THE `@aura/protocol` package.json SHALL declare zero `@aura/*` internal dependencies.

### Requirement 6: @aura/sdk Package Scaffold

**User Story:** As a developer, I want the `@aura/sdk` package scaffolded with Vite library mode, so that it can be developed as a framework-neutral browser SDK depending on `@aura/protocol`.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `packages/sdk` directory with a `package.json` declaring `name` as `"@aura/sdk"`.
2. THE `@aura/sdk` package.json SHALL declare `@aura/protocol` as a runtime `dependency` using the `workspace:*` protocol.
3. THE `@aura/sdk` package.json SHALL declare `vite` as a `devDependency` for library-mode builds.
4. THE `@aura/sdk` package.json SHALL declare `exports` field with ESM output and TypeScript declarations.
5. THE Package_Scaffold SHALL include a `vite.config.ts` configured for library mode with `@aura/protocol` marked as an external dependency.
6. THE Package_Scaffold SHALL include a `src/index.ts` placeholder file.
7. THE `@aura/sdk` Package_Tsconfig SHALL declare a project reference to `../protocol`.

### Requirement 7: @aura/react Package Scaffold

**User Story:** As a developer, I want the `@aura/react` package scaffolded with correct peer dependencies on React and internal dependencies on `@aura/sdk` and `@aura/protocol`, so that it can be developed as a React adapter.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `packages/react` directory with a `package.json` declaring `name` as `"@aura/react"`.
2. THE `@aura/react` package.json SHALL declare `@aura/protocol` and `@aura/sdk` as runtime `dependencies` using the `workspace:*` protocol.
3. THE `@aura/react` package.json SHALL declare `react` and `react-dom` as `peerDependencies` with a version range supporting React 18 and 19.
4. THE `@aura/react` package.json SHALL declare `vite` and `@vitejs/plugin-react` as `devDependencies`.
5. THE Package_Scaffold SHALL include a `vite.config.ts` configured for library mode with `react`, `react-dom`, `@aura/protocol`, and `@aura/sdk` marked as external dependencies.
6. THE Package_Scaffold SHALL include a `src/index.ts` placeholder file.
7. THE `@aura/react` Package_Tsconfig SHALL declare project references to `../protocol` and `../sdk`.

### Requirement 8: @aura/server Package Scaffold

**User Story:** As a developer, I want the `@aura/server` package scaffolded with Hono as the HTTP framework and correct internal dependency on `@aura/protocol`, so that it can be developed as the AUIP v0 server.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `packages/server` directory with a `package.json` declaring `name` as `"@aura/server"`.
2. THE `@aura/server` package.json SHALL declare `@aura/protocol` as a runtime `dependency` using the `workspace:*` protocol.
3. THE `@aura/server` package.json SHALL declare `hono` as a runtime `dependency`.
4. THE `@aura/server` package.json SHALL declare `tsup` as a `devDependency` for building the server package.
5. THE `@aura/server` package.json SHALL declare `exports` field with ESM output and TypeScript declarations.
6. THE Package_Scaffold SHALL include a `tsup.config.ts` configured for ESM format output with declaration generation enabled.
7. THE Package_Scaffold SHALL include a `src/index.ts` placeholder file.
8. THE `@aura/server` Package_Tsconfig SHALL declare a project reference to `../protocol`.

### Requirement 9: @aura/rules Package Scaffold

**User Story:** As a developer, I want the `@aura/rules` package scaffolded with the correct internal dependency on `@aura/protocol`, so that it can be developed as the deterministic rules DSL and evaluator.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `packages/rules` directory with a `package.json` declaring `name` as `"@aura/rules"`.
2. THE `@aura/rules` package.json SHALL declare `@aura/protocol` as a runtime `dependency` using the `workspace:*` protocol.
3. THE `@aura/rules` package.json SHALL declare `tsup` as a `devDependency` for building the rules package.
4. THE `@aura/rules` package.json SHALL declare `exports` field with ESM output and TypeScript declarations.
5. THE Package_Scaffold SHALL include a `tsup.config.ts` configured for ESM format output with declaration generation enabled.
6. THE Package_Scaffold SHALL include a `src/index.ts` placeholder file.
7. THE `@aura/rules` Package_Tsconfig SHALL declare a project reference to `../protocol`.

### Requirement 10: @aura/devtools Package Scaffold

**User Story:** As a developer, I want the `@aura/devtools` package scaffolded as a React-based inspector panel with correct internal dependency on `@aura/protocol`, so that it can be developed as the developer experience tool.

#### Acceptance Criteria

1. THE Monorepo SHALL contain a `packages/devtools` directory with a `package.json` declaring `name` as `"@aura/devtools"`.
2. THE `@aura/devtools` package.json SHALL declare `@aura/protocol` as a runtime `dependency` using the `workspace:*` protocol.
3. THE `@aura/devtools` package.json SHALL declare `react` and `react-dom` as `peerDependencies` with a version range supporting React 18 and 19.
4. THE `@aura/devtools` package.json SHALL declare `vite` and `@vitejs/plugin-react` as `devDependencies`.
5. THE Package_Scaffold SHALL include a `vite.config.ts` configured for library mode with `react`, `react-dom`, and `@aura/protocol` marked as external dependencies.
6. THE Package_Scaffold SHALL include a `src/index.ts` placeholder file.
7. THE `@aura/devtools` Package_Tsconfig SHALL declare a project reference to `../protocol`.

### Requirement 11: Dependency Graph Integrity

**User Story:** As a developer, I want the internal dependency graph to be correctly enforced, so that packages only depend on their declared upstream packages and circular dependencies are impossible.

#### Acceptance Criteria

1. THE `@aura/protocol` package SHALL declare zero `@aura/*` internal dependencies.
2. THE `@aura/sdk` package SHALL declare only `@aura/protocol` as an internal dependency.
3. THE `@aura/react` package SHALL declare only `@aura/protocol` and `@aura/sdk` as internal dependencies.
4. THE `@aura/server` package SHALL declare only `@aura/protocol` as an internal dependency.
5. THE `@aura/rules` package SHALL declare only `@aura/protocol` as an internal dependency.
6. THE `@aura/devtools` package SHALL declare only `@aura/protocol` as an internal dependency.
7. WHEN `turbo build` executes, THE Build_Pipeline SHALL build `@aura/protocol` before any package that depends on it.

### Requirement 12: Development Workflow Scripts

**User Story:** As a developer, I want root-level scripts for common development tasks, so that I can build, test, lint, type-check, and run dev mode across all packages with a single command.

#### Acceptance Criteria

1. WHEN a developer runs `pnpm build` at the workspace root, THE Monorepo SHALL invoke `turbo run build` to build all packages in topological order.
2. WHEN a developer runs `pnpm test` at the workspace root, THE Monorepo SHALL invoke `turbo run test` to run Vitest in all packages.
3. WHEN a developer runs `pnpm lint` at the workspace root, THE Monorepo SHALL invoke `turbo run lint` to lint all packages.
4. WHEN a developer runs `pnpm typecheck` at the workspace root, THE Monorepo SHALL invoke `turbo run typecheck` to type-check all packages using `tsc --noEmit`.
5. WHEN a developer runs `pnpm dev` at the workspace root, THE Monorepo SHALL invoke `turbo run dev` to start all packages in watch/dev mode concurrently.
6. WHEN a developer runs `pnpm test` within a single package directory, THE package SHALL execute Vitest for that package only.

### Requirement 13: Package Entry Points and Exports

**User Story:** As a developer, I want each package to declare proper `exports`, `main`, `module`, and `types` fields, so that consumers resolve the correct build artifact regardless of their bundler or module system.

#### Acceptance Criteria

1. THE `@aura/protocol` package.json SHALL declare `exports` with conditional `import`, `require`, and `types` subpaths for the `"."` entry.
2. WHEN a package uses Vite library mode, THE package.json SHALL declare `exports` with `import` and `types` conditions for the `"."` entry.
3. THE package.json of every package SHALL declare a `types` top-level field pointing to the TypeScript declaration entry file.
4. THE package.json of every package SHALL declare a `files` field that includes only the `dist` directory and `package.json` for publishing.

### Requirement 14: Version Pinning and Package Versions

**User Story:** As a developer, I want all tooling dependencies pinned to latest stable versions, so that the development environment is reproducible and uses current features.

#### Acceptance Criteria

1. THE Root_Package_Json SHALL pin `typescript` to the latest stable 5.x version.
2. THE Root_Package_Json SHALL pin `turbo` to the latest stable 2.x version.
3. THE Root_Package_Json SHALL pin `vitest` to the latest stable 3.x version.
4. THE Root_Package_Json SHALL pin `fast-check` to the latest stable 4.x version.
5. WHEN a package declares `vite` as a devDependency, THE package SHALL pin it to the latest stable 6.x version.
6. WHEN a package declares `tsup` as a devDependency, THE package SHALL pin it to the latest stable 8.x version.
7. THE `@aura/protocol` package SHALL pin `zod` to the latest stable 3.x version.
8. THE `@aura/server` package SHALL pin `hono` to the latest stable 4.x version.
