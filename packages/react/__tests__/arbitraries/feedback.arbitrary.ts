import fc from "fast-check";
import type { FeedbackEvent } from "@aura/protocol";

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 50 });

const arbISOTimestamp = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-01-01T00:00:00Z"),
  })
  .map((d) => d.toISOString());

const feedbackActions = ["accept", "dismiss", "override", "undo", "reject", "error"] as const;

export const arbFeedbackEvent: fc.Arbitrary<FeedbackEvent> = fc.record({
  prescriptionId: arbNonEmptyString,
  action: fc.constantFrom(...feedbackActions),
  timestamp: arbISOTimestamp,
  reason: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  contextSequenceId: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
});
