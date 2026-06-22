import * as fc from "fast-check";

/**
 * Generates a valid ISO 8601 timestamp string.
 * Uses a reasonable date range and converts to ISO string format.
 */
export function arbISOTimestamp(): fc.Arbitrary<string> {
  return fc
    .date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") })
    .map((d) => d.toISOString());
}

/**
 * Generates a string that is NOT a valid ISO 8601 timestamp.
 * Filters out strings that could be parsed as valid dates by the Date constructor.
 */
export function arbNonISOString(): fc.Arbitrary<string> {
  return fc
    .stringOf(
      fc.char().filter((c) => c !== "T" && c !== "Z"),
      { minLength: 1, maxLength: 20 },
    )
    .filter((s) => isNaN(new Date(s).getTime()));
}

/**
 * Generates a non-empty string (at least 1 character).
 */
export function arbNonEmptyString(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 100 });
}

/**
 * Generates a number in the closed interval [0, 1] for confidence values.
 */
export function arbConfidence(): fc.Arbitrary<number> {
  return fc.double({ min: 0, max: 1, noNaN: true });
}

/**
 * Generates a non-negative integer for context sequence IDs.
 */
export function arbContextSequenceId(): fc.Arbitrary<number> {
  return fc.nat();
}

/**
 * Generates a string NOT in the provided valid set (for testing enum rejection).
 * Useful for verifying that schemas reject invalid enum values.
 */
export function arbInvalidEnumValue(validSet: readonly string[]): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !validSet.includes(s));
}
