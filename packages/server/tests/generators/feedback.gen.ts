import fc from "fast-check";
import type { FeedbackEvent } from "@aura/protocol";

const feedbackActions = ["accept", "dismiss", "override", "undo", "reject", "error"] as const;

/**
 * Arbitrary for a valid ISO 8601 timestamp.
 */
const arbISOTimestamp = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-12-31T23:59:59Z"),
  })
  .map((d) => d.toISOString());

/**
 * Arbitrary for a valid FeedbackEvent matching FeedbackEventSchema.
 */
export const arbFeedbackEvent: fc.Arbitrary<FeedbackEvent> = fc.record({
  prescriptionId: fc.string({ minLength: 1, maxLength: 36 }),
  action: fc.constantFrom(...feedbackActions),
  timestamp: arbISOTimestamp,
  reason: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
});

/**
 * Arbitrary for an invalid FeedbackEvent that violates schema constraints.
 */
export const arbInvalidFeedbackEvent = fc.oneof(
  // Empty prescriptionId
  fc.record({
    prescriptionId: fc.constant(""),
    action: fc.constantFrom(...feedbackActions),
    timestamp: arbISOTimestamp,
    reason: fc.constant(undefined),
    contextSequenceId: fc.constant(undefined),
  }),
  // Invalid action
  fc.record({
    prescriptionId: fc.string({ minLength: 1, maxLength: 36 }),
    action: fc.constant("invalidAction" as (typeof feedbackActions)[number]),
    timestamp: arbISOTimestamp,
    reason: fc.constant(undefined),
    contextSequenceId: fc.constant(undefined),
  }),
  // Invalid timestamp
  fc.record({
    prescriptionId: fc.string({ minLength: 1, maxLength: 36 }),
    action: fc.constantFrom(...feedbackActions),
    timestamp: fc.constant("not-a-valid-timestamp"),
    reason: fc.constant(undefined),
    contextSequenceId: fc.constant(undefined),
  }),
  // Empty reason string (when present, must be min 1 char)
  fc.record({
    prescriptionId: fc.string({ minLength: 1, maxLength: 36 }),
    action: fc.constantFrom(...feedbackActions),
    timestamp: arbISOTimestamp,
    reason: fc.constant(""),
    contextSequenceId: fc.constant(undefined),
  })
);
