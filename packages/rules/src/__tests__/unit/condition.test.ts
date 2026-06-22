/**
 * Unit tests for the condition evaluator.
 *
 * Tests dot-path resolution, existential event matching,
 * and all 10 condition operators.
 */

import { describe, it, expect } from "vitest";
import {
  resolvePath,
  evaluateCondition,
  evaluateConditions,
} from "../../evaluator/condition.js";
import type { Condition, RulesPipelineInput } from "../../schema/types.js";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<RulesPipelineInput> = {}): RulesPipelineInput {
  return {
    events: [
      {
        type: "surface.viewed",
        surfaceId: "search-results",
        timestamp: "2024-01-01T00:00:00Z",
        payload: { query: "shoes", count: 42 },
      },
    ],
    context: { device: "mobile", region: "us-east-1" },
    contextSequenceId: "seq-001",
    profile: { intentKey: "browse", tier: "premium" },
    manifest: { surfaces: [] },
    consent: {},
    sessionId: "session-001",
    eventBatchId: "batch-001",
    ...overrides,
  };
}

// ─── resolvePath ──────────────────────────────────────────────────────────────

describe("resolvePath", () => {
  it("resolves a top-level field", () => {
    const input = makeInput();
    expect(resolvePath(input, "sessionId")).toBe("session-001");
  });

  it("resolves nested context fields via dot notation", () => {
    const input = makeInput();
    expect(resolvePath(input, "context.device")).toBe("mobile");
  });

  it("resolves deeply nested fields", () => {
    const input = makeInput({
      context: { nested: { deep: { value: 123 } } },
    });
    expect(resolvePath(input, "context.nested.deep.value")).toBe(123);
  });

  it("returns undefined for missing paths without throwing", () => {
    const input = makeInput();
    expect(resolvePath(input, "context.nonexistent.deep")).toBeUndefined();
  });

  it("returns undefined for missing top-level paths", () => {
    const input = makeInput();
    expect(resolvePath(input, "doesNotExist")).toBeUndefined();
  });

  it("returns undefined when intermediate is null", () => {
    const input = makeInput({
      context: { value: null } as unknown as Record<string, unknown>,
    });
    expect(resolvePath(input, "context.value.nested")).toBeUndefined();
  });

  describe("events existential matching", () => {
    it("resolves path from first event with a defined value", () => {
      const input = makeInput({
        events: [
          {
            type: "surface.viewed",
            surfaceId: "search-results",
            timestamp: "2024-01-01T00:00:00Z",
            payload: { query: "shoes" },
          },
        ],
      });
      expect(resolvePath(input, "events.type")).toBe("surface.viewed");
    });

    it("resolves nested event payload paths", () => {
      const input = makeInput({
        events: [
          {
            type: "interaction.clicked",
            surfaceId: "product-card",
            timestamp: "2024-01-01T00:00:00Z",
            payload: { item: { id: "abc" } },
          },
        ],
      });
      expect(resolvePath(input, "events.payload.item.id")).toBe("abc");
    });

    it("performs existential match across multiple events", () => {
      const input = makeInput({
        events: [
          {
            type: "surface.viewed",
            surfaceId: "search-results",
            timestamp: "2024-01-01T00:00:00Z",
            payload: {},
          },
          {
            type: "interaction.clicked",
            surfaceId: "product-card",
            timestamp: "2024-01-01T00:01:00Z",
            payload: { targetId: "btn-42" },
          },
        ],
      });
      // First event doesn't have targetId in payload, second does
      expect(resolvePath(input, "events.payload.targetId")).toBe("btn-42");
    });

    it("returns undefined when no event has the requested path", () => {
      const input = makeInput({
        events: [
          {
            type: "surface.viewed",
            surfaceId: "search-results",
            timestamp: "2024-01-01T00:00:00Z",
            payload: {},
          },
        ],
      });
      expect(resolvePath(input, "events.payload.nonexistent")).toBeUndefined();
    });

    it("returns undefined when events array is empty", () => {
      const input = makeInput({ events: [] });
      expect(resolvePath(input, "events.type")).toBeUndefined();
    });
  });
});

// ─── evaluateCondition ────────────────────────────────────────────────────────

describe("evaluateCondition", () => {
  describe("eq operator", () => {
    it("returns true when resolved value strictly equals condition value", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "eq", value: "mobile" };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved value does not match", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "eq", value: "desktop" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when path does not exist", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.missing", operator: "eq", value: "any" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("uses strict equality (no type coercion)", () => {
      const input = makeInput({ context: { count: 1 } });
      const condition: Condition = { path: "context.count", operator: "eq", value: "1" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("neq operator", () => {
    it("returns true when resolved value does not equal condition value", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "neq", value: "desktop" };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when values are equal", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "neq", value: "mobile" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when path does not exist", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.missing", operator: "neq", value: "any" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("in operator", () => {
    it("returns true when resolved value is in the array", () => {
      const input = makeInput();
      const condition: Condition = {
        path: "context.device",
        operator: "in",
        value: ["mobile", "tablet"],
      };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved value is not in the array", () => {
      const input = makeInput();
      const condition: Condition = {
        path: "context.device",
        operator: "in",
        value: ["desktop", "tablet"],
      };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when value is not an array", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "in", value: "mobile" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when path does not exist", () => {
      const input = makeInput();
      const condition: Condition = {
        path: "context.missing",
        operator: "in",
        value: ["a", "b"],
      };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("notIn operator", () => {
    it("returns true when resolved value is not in the array", () => {
      const input = makeInput();
      const condition: Condition = {
        path: "context.device",
        operator: "notIn",
        value: ["desktop", "tablet"],
      };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved value is in the array", () => {
      const input = makeInput();
      const condition: Condition = {
        path: "context.device",
        operator: "notIn",
        value: ["mobile", "tablet"],
      };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when value is not an array", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "notIn", value: "mobile" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("gt operator", () => {
    it("returns true when resolved value is greater than condition value", () => {
      const input = makeInput({ context: { score: 10 } });
      const condition: Condition = { path: "context.score", operator: "gt", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved value is equal", () => {
      const input = makeInput({ context: { score: 5 } });
      const condition: Condition = { path: "context.score", operator: "gt", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when resolved value is less", () => {
      const input = makeInput({ context: { score: 3 } });
      const condition: Condition = { path: "context.score", operator: "gt", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when path does not exist", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.missing", operator: "gt", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("gte operator", () => {
    it("returns true when resolved value is greater than or equal to condition value", () => {
      const input = makeInput({ context: { score: 5 } });
      const condition: Condition = { path: "context.score", operator: "gte", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved value is less", () => {
      const input = makeInput({ context: { score: 4 } });
      const condition: Condition = { path: "context.score", operator: "gte", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("lt operator", () => {
    it("returns true when resolved value is less than condition value", () => {
      const input = makeInput({ context: { score: 3 } });
      const condition: Condition = { path: "context.score", operator: "lt", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved value is equal", () => {
      const input = makeInput({ context: { score: 5 } });
      const condition: Condition = { path: "context.score", operator: "lt", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when resolved value is greater", () => {
      const input = makeInput({ context: { score: 7 } });
      const condition: Condition = { path: "context.score", operator: "lt", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("lte operator", () => {
    it("returns true when resolved value is less than or equal to condition value", () => {
      const input = makeInput({ context: { score: 5 } });
      const condition: Condition = { path: "context.score", operator: "lte", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved value is greater", () => {
      const input = makeInput({ context: { score: 6 } });
      const condition: Condition = { path: "context.score", operator: "lte", value: 5 };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("exists operator", () => {
    it("returns true when the path resolves to a defined value", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "exists" };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when the path does not exist", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.missing", operator: "exists" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when the value is null", () => {
      const input = makeInput({
        context: { device: null } as unknown as Record<string, unknown>,
      });
      const condition: Condition = { path: "context.device", operator: "exists" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns true for falsy but defined values (0, empty string, false)", () => {
      const input = makeInput({ context: { count: 0, name: "", flag: false } });
      expect(evaluateCondition({ path: "context.count", operator: "exists" }, input)).toBe(true);
      expect(evaluateCondition({ path: "context.name", operator: "exists" }, input)).toBe(true);
      expect(evaluateCondition({ path: "context.flag", operator: "exists" }, input)).toBe(true);
    });
  });

  describe("matches operator", () => {
    it("returns true when resolved string matches the regex", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "matches", value: "^mob" };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("returns false when resolved string does not match", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.device", operator: "matches", value: "^desk" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when resolved value is not a string", () => {
      const input = makeInput({ context: { count: 42 } });
      const condition: Condition = { path: "context.count", operator: "matches", value: "\\d+" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });

    it("returns false when path does not exist", () => {
      const input = makeInput();
      const condition: Condition = { path: "context.missing", operator: "matches", value: ".*" };
      expect(evaluateCondition(condition, input)).toBe(false);
    });
  });

  describe("events existential matching in conditions", () => {
    it("evaluates condition against event fields", () => {
      const input = makeInput();
      const condition: Condition = { path: "events.type", operator: "eq", value: "surface.viewed" };
      expect(evaluateCondition(condition, input)).toBe(true);
    });

    it("matches across multiple events", () => {
      const input = makeInput({
        events: [
          {
            type: "surface.viewed",
            surfaceId: "search-results",
            timestamp: "2024-01-01T00:00:00Z",
            payload: {},
          },
          {
            type: "interaction.clicked",
            surfaceId: "product-card",
            timestamp: "2024-01-01T00:01:00Z",
            payload: { targetId: "btn-42" },
          },
        ],
      });
      // Second event has the clicked type
      const condition: Condition = {
        path: "events.type",
        operator: "eq",
        value: "interaction.clicked",
      };
      expect(evaluateCondition(condition, input)).toBe(true);
    });
  });
});

// ─── evaluateConditions ───────────────────────────────────────────────────────

describe("evaluateConditions", () => {
  it("returns true when all conditions pass (logical AND)", () => {
    const input = makeInput();
    const conditions: Condition[] = [
      { path: "context.device", operator: "eq", value: "mobile" },
      { path: "events.type", operator: "eq", value: "surface.viewed" },
    ];
    expect(evaluateConditions(conditions, input)).toBe(true);
  });

  it("returns false when any condition fails", () => {
    const input = makeInput();
    const conditions: Condition[] = [
      { path: "context.device", operator: "eq", value: "mobile" },
      { path: "context.device", operator: "eq", value: "desktop" }, // fails
    ];
    expect(evaluateConditions(conditions, input)).toBe(false);
  });

  it("returns true for an empty conditions array", () => {
    const input = makeInput();
    expect(evaluateConditions([], input)).toBe(true);
  });

  it("short-circuits on first failing condition", () => {
    const input = makeInput();
    const conditions: Condition[] = [
      { path: "context.missing", operator: "eq", value: "x" }, // fails
      { path: "context.device", operator: "eq", value: "mobile" },
    ];
    expect(evaluateConditions(conditions, input)).toBe(false);
  });
});
