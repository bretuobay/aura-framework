/**
 * Custom fast-check generators for valid AuraEvent values.
 * Produces values conforming to @aura/protocol AuraEventSchema.
 */
import fc from "fast-check";
import type { AuraEvent, DataClass } from "@aura/protocol";
import { DATA_CLASSES } from "./manifest.arbitrary.js";

// =============================================================================
// Shared helpers
// =============================================================================

/** Generate a valid ISO 8601 timestamp string */
export const arbISOTimestamp: fc.Arbitrary<string> = fc
  .date({
    min: new Date("2020-01-01T00:00:00.000Z"),
    max: new Date("2030-12-31T23:59:59.999Z"),
  })
  .map((d) => d.toISOString());

/** Generate a future ISO 8601 timestamp string (relative to now) */
export const arbFutureISOTimestamp: fc.Arbitrary<string> = fc
  .integer({ min: 1000, max: 86400000 }) // 1 second to 1 day in the future
  .map((offset) => new Date(Date.now() + offset).toISOString());

/** Generate a past ISO 8601 timestamp string (relative to now) */
export const arbPastISOTimestamp: fc.Arbitrary<string> = fc
  .integer({ min: 1000, max: 86400000 }) // 1 second to 1 day in the past
  .map((offset) => new Date(Date.now() - offset).toISOString());

// =============================================================================
// AuraEvent types — covers the minimum vocabulary and extensible types
// =============================================================================

const STANDARD_EVENT_TYPES = [
  "surface.viewed",
  "interaction.clicked",
  "interaction.dismissed",
  "feedback.submitted",
  "context.changed",
] as const;

const arbEventType: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(...STANDARD_EVENT_TYPES),
  fc.stringMatching(/^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/), // extensible custom types
);

const arbSurfaceId: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,30}$/);

const arbPayload: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/),
  fc.oneof(fc.string({ maxLength: 50 }), fc.integer(), fc.boolean(), fc.constant(null)),
  { minKeys: 0, maxKeys: 5 },
);

// =============================================================================
// Valid AuraEvent
// =============================================================================

export const arbAuraEvent: fc.Arbitrary<AuraEvent> = fc
  .tuple(
    arbEventType,
    arbSurfaceId,
    arbISOTimestamp,
    arbPayload,
    fc.option(
      fc.array(fc.constantFrom(...DATA_CLASSES), {
        minLength: 1,
        maxLength: 4,
      }),
      { nil: undefined },
    ),
  )
  .map(([type, surfaceId, timestamp, payload, dataClasses]) => {
    const event: AuraEvent = { type, surfaceId, timestamp, payload };
    if (dataClasses !== undefined) {
      event.dataClasses = dataClasses as DataClass[];
    }
    return event;
  });

/** AuraEvent with a specific surfaceId (useful for targeted tests) */
export const arbAuraEventForSurface = (surfaceId: string): fc.Arbitrary<AuraEvent> =>
  arbAuraEvent.map((event) => ({ ...event, surfaceId }));

/** Generate a batch of valid AuraEvent values */
export const arbAuraEventBatch = (minSize = 1, maxSize = 10): fc.Arbitrary<AuraEvent[]> =>
  fc.array(arbAuraEvent, { minLength: minSize, maxLength: maxSize });

// =============================================================================
// Invalid AuraEvent generators (for validation error tests)
// =============================================================================

/** Event with empty type string */
export const arbInvalidEventEmptyType: fc.Arbitrary<Record<string, unknown>> = arbAuraEvent.map(
  (event) => ({ ...event, type: "" }),
);

/** Event with empty surfaceId */
export const arbInvalidEventEmptySurface: fc.Arbitrary<Record<string, unknown>> = arbAuraEvent.map(
  (event) => ({ ...event, surfaceId: "" }),
);

/** Event with invalid timestamp */
export const arbInvalidEventBadTimestamp: fc.Arbitrary<Record<string, unknown>> = arbAuraEvent.map(
  (event) => ({ ...event, timestamp: "not-a-date" }),
);

/** Event with missing payload */
export const arbInvalidEventNoPayload: fc.Arbitrary<Record<string, unknown>> = arbAuraEvent.map(
  ({ payload, ...rest }) => rest,
);
