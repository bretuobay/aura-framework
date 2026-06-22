import { z } from "zod";

/**
 * A non-empty string schema used across many schemas for required string fields.
 */
export const NonEmptyString = z.string().min(1);
export type NonEmptyString = z.infer<typeof NonEmptyString>;

/**
 * A refined string schema validating ISO 8601 timestamp format.
 * Uses Date parsing to validate that the string represents a real date/time.
 * Accepts strings like "2024-01-15T10:30:00.000Z", "2024-01-15T10:30:00Z",
 * or "2024-01-15T10:30:00+05:30".
 */
export const ISOTimestamp = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: "Invalid ISO 8601 timestamp" }
);
export type ISOTimestamp = z.infer<typeof ISOTimestamp>;

/**
 * A number in the closed interval [0, 1], used for confidence scores.
 */
export const Confidence = z.number().min(0).max(1);
export type Confidence = z.infer<typeof Confidence>;

/**
 * A non-negative integer used as a context sequence identifier.
 */
export const ContextSequenceId = z.number().int().nonnegative();
export type ContextSequenceId = z.infer<typeof ContextSequenceId>;

/**
 * An alias for NonEmptyString, used as a session identifier.
 */
export const SessionId = NonEmptyString;
export type SessionId = z.infer<typeof SessionId>;
