/**
 * Integration tests for the `aura-rules test` CLI command.
 *
 * Tests the test command's core behavior by exercising the command action
 * function directly with fixture files, verifying:
 * - Summary output format (total, passed, failed, errors)
 * - Verbose output with per-fixture details
 * - Warning and exit 0 when no fixtures match glob
 * - Error and exit 1 when fixture file cannot be parsed
 * - Exit code 0 if all pass; exit code 1 if any fail or error
 *
 * Requirements validated: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = resolve(__dirname, "../__fixtures__/cli-test");

// ─── Test Fixture Files Setup ─────────────────────────────────────────────────

function setupFixtureDir(): void {
  if (existsSync(FIXTURES_DIR)) {
    rmSync(FIXTURES_DIR, { recursive: true });
  }
  mkdirSync(FIXTURES_DIR, { recursive: true });

  // A minimal rules file that loads successfully
  writeFileSync(
    resolve(FIXTURES_DIR, "rules.ts"),
    `
export default [
  {
    id: "test-rule-1",
    priority: 10,
    riskClass: "low",
    conditions: [
      { path: "events.type", operator: "eq", value: "test.event" }
    ],
    actions: [
      {
        adaptationType: "filter",
        surfaceId: "test-surface",
        slotId: "main",
        payload: { visibleFilters: ["brand"] }
      }
    ]
  }
];
`,
  );

  // A passing fixture: expects no prescriptions when event type doesn't match
  writeFileSync(
    resolve(FIXTURES_DIR, "pass.fixture.ts"),
    `
export default {
  id: "fixture-pass",
  description: "No prescriptions when event does not match",
  input: {
    events: [{ type: "other.event", timestamp: "2024-01-01T00:00:00Z" }],
    context: {},
    contextSequenceId: "seq-001",
    profile: {},
    manifest: { version: "1.0.0", surfaces: [] },
    consent: {},
    sessionId: "session-1",
    eventBatchId: "batch-1"
  },
  expected: []
};
`,
  );

  // A fixture with invalid structure (not parseable as Fixture)
  writeFileSync(
    resolve(FIXTURES_DIR, "invalid.fixture.ts"),
    `
export default {
  notAFixture: true
};
`,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("aura-rules test CLI", () => {
  let consoleLogs: string[];
  let consoleErrors: string[];
  let exitCode: number | undefined;

  beforeEach(() => {
    setupFixtureDir();
    consoleLogs = [];
    consoleErrors = [];
    exitCode = undefined;

    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      consoleLogs.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      consoleErrors.push(args.map(String).join(" "));
    });
    vi.spyOn(process, "exit").mockImplementation((code?: number | string | null | undefined) => {
      exitCode = typeof code === "number" ? code : 0;
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(FIXTURES_DIR)) {
      rmSync(FIXTURES_DIR, { recursive: true });
    }
  });

  it("should exit 0 and print summary when all fixtures pass (Req 13.1, 13.3)", async () => {
    const { testCommand } = await import("../../cli/commands/test.js");
    const glob = resolve(FIXTURES_DIR, "pass.fixture.ts");

    try {
      await testCommand.parseAsync(["node", "test", glob]);
    } catch {
      // process.exit throws
    }

    expect(exitCode).toBe(0);
    const output = consoleLogs.join("\n");
    expect(output).toContain("Total: 1");
    expect(output).toContain("Passed: 1");
    expect(output).toContain("Failed: 0");
    expect(output).toContain("Errors: 0");
  });

  it("should print warning and exit 0 when no fixtures match glob (Req 13.4)", async () => {
    const { testCommand } = await import("../../cli/commands/test.js");

    try {
      await testCommand.parseAsync(["node", "test", "nonexistent/**/*.fixture.ts"]);
    } catch {
      // process.exit throws
    }

    expect(exitCode).toBe(0);
    const output = consoleLogs.join("\n");
    expect(output).toContain("Warning");
    expect(output).toContain("No fixture files matched");
  });

  it("should print error and exit 1 when fixture file cannot be parsed (Req 13.5)", async () => {
    const { testCommand } = await import("../../cli/commands/test.js");
    const glob = resolve(FIXTURES_DIR, "invalid.fixture.ts");

    try {
      await testCommand.parseAsync(["node", "test", glob]);
    } catch {
      // process.exit throws
    }

    expect(exitCode).toBe(1);
    const output = consoleErrors.join("\n");
    expect(output).toContain("Error");
    expect(output).toContain("cannot be parsed");
  });

  it("should print verbose output with per-fixture details (Req 13.2)", async () => {
    const { testCommand } = await import("../../cli/commands/test.js");
    const glob = resolve(FIXTURES_DIR, "pass.fixture.ts");

    try {
      await testCommand.parseAsync(["node", "test", "--verbose", glob]);
    } catch {
      // process.exit throws
    }

    expect(exitCode).toBe(0);
    const output = consoleLogs.join("\n");
    expect(output).toContain("fixture-pass");
    expect(output).toContain("No prescriptions when event does not match");
    expect(output).toContain("PASSED");
  });

  it("should print only summary without --verbose (Req 13.3)", async () => {
    const { testCommand } = await import("../../cli/commands/test.js");
    const glob = resolve(FIXTURES_DIR, "pass.fixture.ts");

    try {
      await testCommand.parseAsync(["node", "test", glob]);
    } catch {
      // process.exit throws
    }

    expect(exitCode).toBe(0);
    const output = consoleLogs.join("\n");
    // Summary line should be present
    expect(output).toContain("Total:");
    // Individual fixture ID should NOT be in output without --verbose
    expect(output).not.toContain("fixture-pass");
  });
});
