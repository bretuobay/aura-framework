/**
 * Shared fast-check arbitrary generators for Event types.
 * Used by property-based tests validating Properties 10, 11, 12, 24.
 */
import fc from "fast-check";
import type { AuraEvent } from "@aura/protocol";
import type { EventType } from "@/lib/types";

/** All recognized event type strings */
export const EVENT_TYPES: EventType[] = [
  "surface.viewed",
  "search.submitted",
  "interaction.clicked",
  "interaction.dwelled",
  "context.changed",
  "feedback.submitted",
];

/** Generates a valid ISO 8601 timestamp string */
export const arbISOTimestamp: fc.Arbitrary<string> = fc
  .date({ min: new Date("2024-01-01"), max: new Date("2030-12-31") })
  .map((d) => d.toISOString());

/** Generates a non-empty session ID */
export const arbSessionId: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 36 });

/** Generates a valid event type (from the known vocabulary) */
export const arbEventType: fc.Arbitrary<string> = fc.constantFrom(...EVENT_TYPES);

/** Generates a surface ID */
export const arbSurfaceId: fc.Arbitrary<string> = fc.constantFrom(
  "search.results",
  "filter.panel",
  "product.detail",
);

/**
 * Generates a valid AuraEvent conforming to the @aura/protocol schema.
 * Every event has: type (non-empty), surfaceId (non-empty),
 * timestamp (ISO 8601), payload (object).
 * Validates Property 10: event metadata invariant.
 */
export const arbEvent: fc.Arbitrary<AuraEvent> = fc.record({
  type: arbEventType,
  surfaceId: arbSurfaceId,
  timestamp: arbISOTimestamp,
  payload: fc.record({
    sessionId: arbSessionId,
  }).map((r) => r as Record<string, unknown>),
});

/**
 * Generates an AuraEvent with explicit sessionId in the payload.
 * Ensures the sessionId is always non-empty for Property 10 validation.
 */
export const arbEventWithSession: fc.Arbitrary<AuraEvent & { payload: { sessionId: string } }> =
  fc
    .record({
      type: arbEventType,
      surfaceId: arbSurfaceId,
      timestamp: arbISOTimestamp,
      payload: fc.record({
        sessionId: arbSessionId,
      }),
    })
    .map((rec) => ({
      ...rec,
      payload: rec.payload as Record<string, unknown> & { sessionId: string },
    }));

// ─── Search Query Generators ────────────────────────────────────────────────────

/**
 * Generates a search query string of 0–200 characters (valid input length).
 * Validates Property 24: input accepts at most 200 characters.
 */
export const arbSearchQuery: fc.Arbitrary<string> = fc.string({ minLength: 0, maxLength: 200 });

/**
 * Generates a search query that may exceed 200 characters (edge case testing).
 * Useful for testing truncation behavior (Property 12, 24).
 */
export const arbSearchQueryAnyLength: fc.Arbitrary<string> = fc.string({ minLength: 0, maxLength: 400 });

/**
 * Generates a search query specifically exceeding 256 characters.
 * Useful for testing event payload truncation (Property 12).
 */
export const arbLongSearchQuery: fc.Arbitrary<string> = fc.string({ minLength: 257, maxLength: 400 });

/**
 * Generates a sequence of events for buffer testing (Property 11).
 * Generates between 1 and 150 events to test the 100-event capacity limit.
 */
export const arbEventSequence: fc.Arbitrary<AuraEvent[]> = fc
  .integer({ min: 1, max: 150 })
  .chain((size) => fc.array(arbEvent, { minLength: size, maxLength: size }));

/**
 * Generates a non-empty search query (at least 2 characters, per debounce requirement).
 */
export const arbNonEmptySearchQuery: fc.Arbitrary<string> = fc.string({ minLength: 2, maxLength: 200 });
