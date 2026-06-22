/**
 * FixtureRunner — runs fixture-based tests against a RuleSet.
 *
 * Accepts a RuleSet and an array of Fixture objects, evaluates each fixture's
 * input through the RulesPipeline, matches output against expected
 * PrescriptionMatchers, and reports pass/fail/error per fixture.
 *
 * Requirements validated: 12.1, 12.4, 12.5, 12.6, 12.8, 12.9
 */

import type { RuleSet, RulesPipelineInput } from "../schema/types.js";
import type { Fixture } from "../schema/fixture.schema.js";
import { FixtureSchema } from "../schema/fixture.schema.js";
import { RulesPipeline } from "../evaluator/pipeline.js";
import { matchPrescriptions } from "./matcher.js";
import { generateDiff } from "./diff.js";

export interface FixtureRunResult {
  fixtureId: string;
  status: "passed" | "failed" | "error";
  diff?: string;
  errorMessage?: string;
}

/**
 * FixtureRunner evaluates fixtures against a RuleSet and reports results.
 *
 * - Marks fixtures with invalid input as 'error' (not failure)
 * - Returns results in same order as input fixtures
 * - Uses matchPrescriptions for flexible matching
 * - Generates diff on failure for debugging
 */
export class FixtureRunner {
  /**
   * Runs all fixtures against the provided RuleSet.
   *
   * @param ruleSet - The validated rule set to evaluate against
   * @param fixtures - Array of fixture objects to test
   * @returns Results array in the same order as input fixtures
   */
  async run(
    ruleSet: RuleSet,
    fixtures: Fixture[]
  ): Promise<FixtureRunResult[]> {
    const pipeline = new RulesPipeline({ ruleSet });
    const results: FixtureRunResult[] = [];

    for (const fixture of fixtures) {
      const result = await this.runSingleFixture(pipeline, fixture);
      results.push(result);
    }

    return results;
  }

  /**
   * Runs a single fixture and returns its result.
   * Catches validation and runtime errors to mark as 'error' status.
   */
  private async runSingleFixture(
    pipeline: RulesPipeline,
    fixture: Fixture
  ): Promise<FixtureRunResult> {
    // Validate the fixture input against the schema to catch invalid inputs
    const validation = FixtureSchema.safeParse(fixture);
    if (!validation.success) {
      return {
        fixtureId: fixture.id ?? "(unknown)",
        status: "error",
        errorMessage: `Invalid fixture input: ${validation.error.message}`,
      };
    }

    try {
      // Cast the validated input to RulesPipelineInput
      // The fixture schema validates the shape but uses passthrough for complex nested types
      const input = fixture.input as unknown as RulesPipelineInput;

      // Run the pipeline evaluation
      const output = await pipeline.evaluate(input);

      // Match output against expected matchers
      const matchResult = matchPrescriptions(output, fixture.expected);

      if (matchResult.matched) {
        return {
          fixtureId: fixture.id,
          status: "passed",
        };
      }

      // Generate diff for failed fixtures
      const diff = generateDiff(fixture.expected, output);
      const mismatchDetails = matchResult.mismatches.join("\n  ");

      return {
        fixtureId: fixture.id,
        status: "failed",
        diff: `${diff}\n\n── Mismatches ────────────────────────────────────────\n  ${mismatchDetails}`,
      };
    } catch (error) {
      // If setup/casting causes an error, mark as 'error' (not failure)
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        fixtureId: fixture.id,
        status: "error",
        errorMessage: `Runtime error during fixture evaluation: ${message}`,
      };
    }
  }
}
