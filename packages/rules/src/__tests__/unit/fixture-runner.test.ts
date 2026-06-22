/**
 * Unit tests for FixtureRunner, matchPrescriptions, and generateDiff.
 *
 * Tests the fixture-based test runner components including:
 * - Prescription matching logic (surfaceId, mode, adaptationType, count)
 * - Diff output generation for failed fixtures
 * - FixtureRunner pass/fail/error handling and result ordering
 */

import { describe, it, expect } from "vitest";
import { matchPrescriptions } from "../../fixture/matcher.js";
import { generateDiff } from "../../fixture/diff.js";
import { FixtureRunner } from "../../fixture/runner.js";
import type { UIPrescription } from "@aura/protocol";
import type { PrescriptionMatcher, Fixture } from "../../schema/fixture.schema.js";
import type { RuleSet, Rule } from "../../schema/types.js";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makePrescription(overrides: Partial<UIPrescription> = {}): UIPrescription {
  return {
    id: "presc-001",
    surfaceId: "search-results",
    mode: "recommend",
    latencyClass: "fast",
    contextLock: {
      sequenceId: "seq-001",
      capturedAt: "2024-01-01T00:00:00Z",
    },
    adaptations: [
      {
        type: "filter",
        target: "category-filter",
        visibleFilters: ["brand", "price"],
        reasonCode: "highlight-active",
      },
    ],
    constraints: {
      expiresAt: "2024-01-01T00:00:30Z",
    },
    manifestVersion: "1.0.0",
    audit: {},
    ...overrides,
  };
}

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "rule-filter-highlight",
    priority: 10,
    riskClass: "low",
    conditions: [
      { path: "events.type", operator: "eq", value: "surface.viewed" },
    ],
    actions: [
      {
        adaptationType: "filter",
        surfaceId: "search-results",
        slotId: "filters",
        payload: {
          target: "category-filter",
          visibleFilters: ["brand", "price"],
          reasonCode: "highlight-active",
        },
      },
    ],
    ...overrides,
  };
}

function makeRuleSet(rules: Rule[]): RuleSet {
  return {
    rules,
    size: rules.length,
    getRule(id: string) {
      return rules.find((r) => r.id === id);
    },
    getRuleIds() {
      return rules.map((r) => r.id);
    },
  };
}

function makeFixtureInput() {
  return {
    events: [
      {
        type: "surface.viewed",
        surfaceId: "search-results",
        timestamp: "2024-01-01T00:00:00Z",
        payload: {},
      },
    ],
    context: { device: "mobile" },
    contextSequenceId: "seq-001",
    profile: { tier: "premium" },
    manifest: {
      version: "1.0.0",
      surfaces: [
        {
          id: "search-results",
          components: [
            {
              id: "category-filter",
              variants: [],
            },
          ],
        },
      ],
    },
    consent: { behavior: true },
    sessionId: "session-001",
    eventBatchId: "batch-001",
  };
}

// ─── matchPrescriptions ───────────────────────────────────────────────────────

describe("matchPrescriptions", () => {
  describe("surfaceId matching", () => {
    it("matches when surfaceId is present in output", () => {
      const output = [makePrescription({ surfaceId: "search-results" })];
      const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results" }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
      expect(result.mismatches).toHaveLength(0);
    });

    it("fails when surfaceId is not in output", () => {
      const output = [makePrescription({ surfaceId: "product-card" })];
      const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results" }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches[0]).toContain("search-results");
    });
  });

  describe("mode matching", () => {
    it("matches when mode is present in output", () => {
      const output = [makePrescription({ mode: "autoApply" })];
      const expected: PrescriptionMatcher[] = [{ mode: "autoApply" }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
    });

    it("fails when mode does not match", () => {
      const output = [makePrescription({ mode: "recommend" })];
      const expected: PrescriptionMatcher[] = [{ mode: "autoApply" }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
    });
  });

  describe("adaptationType matching", () => {
    it("matches when output has an adaptation with matching type", () => {
      const output = [makePrescription()]; // has "filter" adaptation
      const expected: PrescriptionMatcher[] = [{ adaptationType: "filter" }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
    });

    it("fails when no adaptation matches the type", () => {
      const output = [makePrescription()]; // has "filter" adaptation
      const expected: PrescriptionMatcher[] = [{ adaptationType: "rank" }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
    });
  });

  describe("count matching", () => {
    it("passes when count matches the number of matching prescriptions", () => {
      const output = [
        makePrescription({ surfaceId: "search-results" }),
        makePrescription({ surfaceId: "search-results", id: "presc-002" }),
      ];
      const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results", count: 2 }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
    });

    it("fails when count does not match", () => {
      const output = [makePrescription({ surfaceId: "search-results" })];
      const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results", count: 2 }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
      expect(result.mismatches[0]).toContain("2");
      expect(result.mismatches[0]).toContain("1");
    });

    it("passes when count is 0 and no prescriptions match", () => {
      const output: UIPrescription[] = [];
      const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results", count: 0 }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
    });

    it("fails when count is 0 but prescriptions exist", () => {
      const output = [makePrescription({ surfaceId: "search-results" })];
      const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results", count: 0 }];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
    });
  });

  describe("combined field matching", () => {
    it("matches on multiple fields simultaneously", () => {
      const output = [makePrescription({ surfaceId: "search-results", mode: "recommend" })];
      const expected: PrescriptionMatcher[] = [
        { surfaceId: "search-results", mode: "recommend", adaptationType: "filter" },
      ];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
    });

    it("fails when one of the combined fields does not match", () => {
      const output = [makePrescription({ surfaceId: "search-results", mode: "recommend" })];
      const expected: PrescriptionMatcher[] = [
        { surfaceId: "search-results", mode: "autoApply" },
      ];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
    });
  });

  describe("empty matcher", () => {
    it("matches any prescription when no fields are specified", () => {
      const output = [makePrescription()];
      const expected: PrescriptionMatcher[] = [{}];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
    });

    it("fails empty matcher when output is empty", () => {
      const output: UIPrescription[] = [];
      const expected: PrescriptionMatcher[] = [{}];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
    });
  });

  describe("multiple matchers", () => {
    it("passes when all matchers are satisfied", () => {
      const output = [
        makePrescription({ surfaceId: "search-results" }),
        makePrescription({ surfaceId: "product-card", id: "presc-002" }),
      ];
      const expected: PrescriptionMatcher[] = [
        { surfaceId: "search-results" },
        { surfaceId: "product-card" },
      ];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(true);
    });

    it("fails when any matcher is not satisfied", () => {
      const output = [makePrescription({ surfaceId: "search-results" })];
      const expected: PrescriptionMatcher[] = [
        { surfaceId: "search-results" },
        { surfaceId: "product-card" },
      ];
      const result = matchPrescriptions(output, expected);
      expect(result.matched).toBe(false);
      expect(result.mismatches).toHaveLength(1);
    });
  });
});

// ─── generateDiff ─────────────────────────────────────────────────────────────

describe("generateDiff", () => {
  it("shows expected matchers and actual prescriptions", () => {
    const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results", mode: "recommend" }];
    const actual = [makePrescription({ surfaceId: "product-card", mode: "autoApply" })];
    const diff = generateDiff(expected, actual);
    expect(diff).toContain("Expected");
    expect(diff).toContain("Actual");
    expect(diff).toContain("search-results");
    expect(diff).toContain("product-card");
  });

  it("shows empty message when no prescriptions produced", () => {
    const expected: PrescriptionMatcher[] = [{ surfaceId: "search-results" }];
    const diff = generateDiff(expected, []);
    expect(diff).toContain("no prescriptions produced");
  });

  it("shows empty message when no matchers specified", () => {
    const diff = generateDiff([], [makePrescription()]);
    expect(diff).toContain("no matchers specified");
  });
});

// ─── FixtureRunner ────────────────────────────────────────────────────────────

describe("FixtureRunner", () => {
  it("returns results in same order as input fixtures", async () => {
    const ruleSet = makeRuleSet([]);
    const fixtures: Fixture[] = [
      {
        id: "fixture-a",
        description: "First fixture",
        input: makeFixtureInput(),
        expected: [{ count: 0 }],
      },
      {
        id: "fixture-b",
        description: "Second fixture",
        input: makeFixtureInput(),
        expected: [{ count: 0 }],
      },
    ];

    const runner = new FixtureRunner();
    const results = await runner.run(ruleSet, fixtures);

    expect(results).toHaveLength(2);
    expect(results[0].fixtureId).toBe("fixture-a");
    expect(results[1].fixtureId).toBe("fixture-b");
  });

  it("marks fixture as passed when expected count is 0 and output is empty", async () => {
    const ruleSet = makeRuleSet([]);
    const fixtures: Fixture[] = [
      {
        id: "empty-output",
        description: "Expects no prescriptions",
        input: makeFixtureInput(),
        expected: [{ count: 0 }],
      },
    ];

    const runner = new FixtureRunner();
    const results = await runner.run(ruleSet, fixtures);

    expect(results[0].status).toBe("passed");
  });

  it("marks fixture as failed with diff when output does not match", async () => {
    const ruleSet = makeRuleSet([]);
    const fixtures: Fixture[] = [
      {
        id: "expects-output",
        description: "Expects at least one prescription",
        input: makeFixtureInput(),
        expected: [{ surfaceId: "search-results" }],
      },
    ];

    const runner = new FixtureRunner();
    const results = await runner.run(ruleSet, fixtures);

    expect(results[0].status).toBe("failed");
    expect(results[0].diff).toBeDefined();
    expect(results[0].diff).toContain("search-results");
  });

  it("marks fixture as error when input is invalid", async () => {
    const ruleSet = makeRuleSet([]);
    const invalidFixture = {
      id: "invalid-input",
      description: "Has invalid input",
      input: {
        // Missing required fields
        events: [],
        context: {},
        contextSequenceId: "",
        profile: {},
        manifest: { surfaces: [] },
        consent: {},
        sessionId: "",
        eventBatchId: "",
      },
      expected: [],
    } as unknown as Fixture;

    const runner = new FixtureRunner();
    const results = await runner.run(ruleSet, [invalidFixture]);

    expect(results[0].status).toBe("error");
    expect(results[0].errorMessage).toBeDefined();
  });

  it("continues running remaining fixtures after an error", async () => {
    const ruleSet = makeRuleSet([]);
    const invalidFixture = {
      id: "invalid",
      description: "Has invalid input",
      input: {
        events: [],
        context: {},
        contextSequenceId: "",
        profile: {},
        manifest: { surfaces: [] },
        consent: {},
        sessionId: "",
        eventBatchId: "",
      },
      expected: [],
    } as unknown as Fixture;

    const validFixture: Fixture = {
      id: "valid",
      description: "Valid fixture",
      input: makeFixtureInput(),
      expected: [{ count: 0 }],
    };

    const runner = new FixtureRunner();
    const results = await runner.run(ruleSet, [invalidFixture, validFixture]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("error");
    expect(results[1].status).toBe("passed");
  });
});
