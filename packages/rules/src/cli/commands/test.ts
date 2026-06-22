/**
 * `aura-rules test <fixtureGlob>` command implementation.
 *
 * Resolves fixture files via fast-glob, loads co-located rules source,
 * runs FixtureRunner, and reports results to stdout.
 *
 * Requirements validated: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { Command } from "commander";
import fg from "fast-glob";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { FixtureSchema } from "../../schema/fixture.schema.js";
import { loadRules } from "../../loader/load-rules.js";
import { FixtureRunner } from "../../fixture/runner.js";
import type { Fixture } from "../../schema/fixture.schema.js";
import type { RuleSource } from "../../schema/types.js";

/**
 * Loads fixtures from a single file. The file may export:
 * - A default export of Fixture or Fixture[]
 * - A named `fixture` export of Fixture or Fixture[]
 * - A module object that is itself a Fixture
 */
async function loadFixturesFromFile(filePath: string): Promise<Fixture[]> {
  const absolutePath = resolve(filePath);
  const fileUrl = pathToFileURL(absolutePath).href;
  const module = await import(fileUrl);

  const raw = module.default ?? module.fixture ?? module;

  const items = Array.isArray(raw) ? raw : [raw];
  const fixtures: Fixture[] = [];

  for (const item of items) {
    const result = FixtureSchema.safeParse(item);
    if (result.success) {
      fixtures.push(result.data as unknown as Fixture);
    }
  }

  return fixtures;
}

/**
 * Finds a co-located rules source file (rules.ts or rules.js) in the same
 * directory as the first fixture file.
 */
function findCoLocatedRulesFile(fixtureDir: string): string | undefined {
  const candidates = ["rules.ts", "rules.js"];
  for (const candidate of candidates) {
    const fullPath = resolve(fixtureDir, candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

/**
 * Loads rules from a file path (TypeScript or JavaScript module).
 * The module should export a default array of Rule objects or a named `rules` export.
 */
async function loadRulesFromFile(rulesPath: string): Promise<RuleSource> {
  const absolutePath = resolve(rulesPath);
  const fileUrl = pathToFileURL(absolutePath).href;
  const module = await import(fileUrl);

  const rules = module.default ?? module.rules ?? module;
  const rulesArray = Array.isArray(rules) ? rules : [rules];

  return { type: "module", rules: rulesArray };
}

export const testCommand = new Command("test")
  .description("Run fixture-based rule tests")
  .argument("<fixtureGlob>", "Glob pattern to resolve fixture files")
  .option("--verbose", "Print detailed per-fixture results")
  .option("--rules <path>", "Path to rules source file (default: co-located)")
  .action(
    async (
      fixtureGlob: string,
      options: { verbose?: boolean; rules?: string }
    ) => {
      // 1. Resolve fixture files via glob
      const filePaths = await fg(fixtureGlob);

      // Req 13.4: No fixtures match → warning + exit 0
      if (filePaths.length === 0) {
        console.log(
          `Warning: No fixture files matched glob "${fixtureGlob}"`
        );
        process.exit(0);
      }

      // 2. Determine rules source
      let rulesSource: RuleSource;
      try {
        if (options.rules) {
          rulesSource = await loadRulesFromFile(options.rules);
        } else {
          // Co-located: look for rules.ts/rules.js in same dir as first fixture
          const firstFixtureDir = dirname(resolve(filePaths[0]));
          const rulesFile = findCoLocatedRulesFile(firstFixtureDir);
          if (!rulesFile) {
            console.error(
              `Error: No co-located rules file found in ${firstFixtureDir}. ` +
                `Provide a rules file with --rules or place rules.ts/rules.js next to fixtures.`
            );
            process.exit(1);
          }
          rulesSource = await loadRulesFromFile(rulesFile);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: Failed to load rules: ${message}`);
        process.exit(1);
      }

      // 3. Load the rule set
      let ruleSet;
      try {
        ruleSet = await loadRules(rulesSource);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: Failed to load rules: ${message}`);
        process.exit(1);
      }

      // 4. Load fixtures from resolved files
      const allFixtures: Fixture[] = [];
      for (const filePath of filePaths) {
        try {
          const fixtures = await loadFixturesFromFile(filePath);
          if (fixtures.length === 0) {
            // Req 13.5: File cannot be parsed as valid fixture
            console.error(
              `Error: Fixture file cannot be parsed: ${filePath}`
            );
            process.exit(1);
          }
          allFixtures.push(...fixtures);
        } catch (err) {
          // Req 13.5: File cannot be parsed → error message + exit 1
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            `Error: Failed to parse fixture file "${filePath}": ${message}`
          );
          process.exit(1);
        }
      }

      // 5. Run fixtures through FixtureRunner
      const runner = new FixtureRunner();
      const results = await runner.run(ruleSet, allFixtures);

      // 6. Compute summary
      let passed = 0;
      let failed = 0;
      let errors = 0;

      for (const result of results) {
        switch (result.status) {
          case "passed":
            passed++;
            break;
          case "failed":
            failed++;
            break;
          case "error":
            errors++;
            break;
        }
      }

      const total = results.length;

      // 7. Output results
      if (options.verbose) {
        // Req 13.2: Print each fixture id, description, and pass/fail status
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const fixture = allFixtures[i];
          const statusIcon =
            result.status === "passed"
              ? "✓"
              : result.status === "failed"
                ? "✗"
                : "⚠";
          const statusLabel = result.status.toUpperCase();
          console.log(
            `${statusIcon} [${statusLabel}] ${fixture.id} — ${fixture.description}`
          );
          if (result.status === "failed" && result.diff) {
            console.log(`  ${result.diff.replace(/\n/g, "\n  ")}`);
          }
          if (result.status === "error" && result.errorMessage) {
            console.log(`  Error: ${result.errorMessage}`);
          }
        }
        console.log("");
      }

      // Req 13.3: Summary line (always printed)
      console.log(
        `Total: ${total}, Passed: ${passed}, Failed: ${failed}, Errors: ${errors}`
      );

      // Exit code: 0 if all pass, 1 if any fail or error
      if (failed > 0 || errors > 0) {
        process.exit(1);
      }
      process.exit(0);
    }
  );
