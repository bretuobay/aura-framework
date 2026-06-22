import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  arbISOTimestamp,
  arbNonISOString,
  arbNonEmptyString,
  arbConfidence,
  arbContextSequenceId,
  arbInvalidEnumValue,
} from "./primitives.arb";

describe("primitives.arb", () => {
  describe("arbISOTimestamp", () => {
    it("generates valid ISO 8601 timestamps that parse as valid dates", () => {
      fc.assert(
        fc.property(arbISOTimestamp(), (ts) => {
          const date = new Date(ts);
          expect(date.getTime()).not.toBeNaN();
          expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("arbNonISOString", () => {
    it("generates strings that do not parse as valid dates", () => {
      fc.assert(
        fc.property(arbNonISOString(), (s) => {
          const date = new Date(s);
          expect(date.getTime()).toBeNaN();
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("arbNonEmptyString", () => {
    it("generates strings with at least 1 character", () => {
      fc.assert(
        fc.property(arbNonEmptyString(), (s) => {
          expect(s.length).toBeGreaterThanOrEqual(1);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("arbConfidence", () => {
    it("generates numbers in [0, 1]", () => {
      fc.assert(
        fc.property(arbConfidence(), (n) => {
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(1);
          expect(Number.isNaN(n)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("arbContextSequenceId", () => {
    it("generates non-negative integers", () => {
      fc.assert(
        fc.property(arbContextSequenceId(), (n) => {
          expect(n).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(n)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("arbInvalidEnumValue", () => {
    it("generates strings not in the valid set", () => {
      const validSet = ["low", "medium", "high", "critical"] as const;
      fc.assert(
        fc.property(arbInvalidEnumValue(validSet), (s) => {
          expect(validSet).not.toContain(s);
          expect(s.length).toBeGreaterThanOrEqual(1);
        }),
        { numRuns: 100 },
      );
    });
  });
});
