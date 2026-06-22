/**
 * Programmatic fixture runner entry point.
 *
 * Resolves fixture files via glob, loads rules, runs FixtureRunner,
 * and returns a FixtureSummary with counts and per-fixture results.
 *
 * Requirements validated: 13.6
 */

import fg from "fast-glob";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { FixtureSchema } from "../schema/fixture.schema.js";
import type { Fixture } from "../schema/fixture.schema.js";
import type { RuleSource } from "../schema/types.js";
import { loadRules } from "../loader/load-rules.js";
import { FixtureRunner } from "./runner.js";
import type { FixtureRunResult } from "./runner.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunFixturesOptions {
  fixtureGlob: string;
  rulesSource: RuleSource;
  verbose?: boolean;
}

export interface FixtureSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  results: FixtureRunResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    // Skip items that don't validate as fixtures (e.g. module metadata)
  }

  return fixtures;
}

// ─── runFixtures ──────────────────────────────────────────────────────────────

/**
 * Programmatic entry point for running fixture-based tests.
 *
 * Resolves fixture files matching the provided glob, loads the rule set
 * from the given source, runs each fixture through FixtureRunner, and
 * returns a summary with total/passed/failed/errors/results.
 */
export async function runFixtures(options: RunFixturesOptions): Promise<FixtureSummary> {
  // 1. Resolve fixture files via glob
  const filePaths = await fg(options.fixtureGlob);

  // 2. Load rules from the provided source
  const ruleSet = await loadRules(options.rulesSource);

  // 3. Load all fixtures from resolved files
  const allFixtures: Fixture[] = [];
  for (const filePath of filePaths) {
    try {
      const fixtures = await loadFixturesFromFile(filePath);
      allFixtures.push(...fixtures);
    } catch {
      // If a file cannot be loaded, add an error result for it
      allFixtures.push({
        id: `file-load-error:${filePath}`,
        description: `Failed to load fixture file: ${filePath}`,
        input: {} as Fixture["input"],
        expected: [],
      });
    }
  }

  // 4. Run all fixtures through FixtureRunner
  const runner = new FixtureRunner();
  const results = await runner.run(ruleSet, allFixtures);

  // 5. Compute summary counts
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

  return {
    total: results.length,
    passed,
    failed,
    errors,
    results,
  };
}
