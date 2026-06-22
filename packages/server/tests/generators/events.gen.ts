import fc from "fast-check";
import type { AuraEvent, EventsRequest } from "@aura/protocol";

const dataClasses = [
  "behavior",
  "personalization",
  "accessibility",
  "approximateLocation",
  "health",
  "education",
  "demographics",
  "emotion",
  "sensitiveInference",
  "cloudModelUse",
  "aggregation",
  "retention",
] as const;

const minEventVocabulary = [
  "surface.viewed",
  "interaction.clicked",
  "interaction.dismissed",
  "feedback.submitted",
  "context.changed",
] as const;

/**
 * Arbitrary for a valid ISO 8601 timestamp string.
 */
const arbISOTimestamp = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-12-31T23:59:59Z"),
  })
  .map((d) => d.toISOString());

/**
 * Arbitrary for a valid AuraEvent matching AuraEventSchema.
 */
export const arbAuraEvent: fc.Arbitrary<AuraEvent> = fc.record({
  type: fc.oneof(
    fc.constantFrom(...minEventVocabulary),
    fc.string({ minLength: 1, maxLength: 50 }),
  ),
  surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
  timestamp: arbISOTimestamp,
  payload: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  ),
  dataClasses: fc.option(
    fc.array(fc.constantFrom(...dataClasses), { minLength: 0, maxLength: 4 }),
    {
      nil: undefined,
    },
  ),
});

/**
 * Arbitrary for an invalid AuraEvent that violates at least one constraint.
 */
export const arbInvalidAuraEvent = fc.oneof(
  // Empty type (violates NonEmptyString)
  fc.record({
    type: fc.constant(""),
    surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
    timestamp: arbISOTimestamp,
    payload: fc.constant({}),
    dataClasses: fc.constant(undefined),
  }),
  // Empty surfaceId
  fc.record({
    type: fc.string({ minLength: 1, maxLength: 30 }),
    surfaceId: fc.constant(""),
    timestamp: arbISOTimestamp,
    payload: fc.constant({}),
    dataClasses: fc.constant(undefined),
  }),
  // Invalid timestamp
  fc.record({
    type: fc.string({ minLength: 1, maxLength: 30 }),
    surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
    timestamp: fc.constant("not-a-date"),
    payload: fc.constant({}),
    dataClasses: fc.constant(undefined),
  }),
  // Invalid dataClass values
  fc.record({
    type: fc.string({ minLength: 1, maxLength: 30 }),
    surfaceId: fc.string({ minLength: 1, maxLength: 30 }),
    timestamp: arbISOTimestamp,
    payload: fc.constant({}),
    dataClasses: fc.constant(["invalidClass" as unknown] as unknown as undefined),
  }),
);

/**
 * Arbitrary for a valid EventsRequest matching EventsRequestSchema.
 */
export const arbEventsRequest: fc.Arbitrary<EventsRequest> = fc.record({
  sessionId: fc.string({ minLength: 1, maxLength: 36 }),
  events: fc
    .array(arbAuraEvent, { minLength: 1, maxLength: 5 })
    .filter((arr) => arr.length >= 1) as fc.Arbitrary<[AuraEvent, ...AuraEvent[]]>,
  contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
});

/**
 * Arbitrary for an invalid EventsRequest.
 */
export const arbInvalidEventsRequest = fc.oneof(
  // Empty sessionId
  fc.record({
    sessionId: fc.constant(""),
    events: fc.array(arbAuraEvent, { minLength: 1, maxLength: 3 }).filter((arr) => arr.length >= 1),
    contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
  }),
  // Empty events array
  fc.record({
    sessionId: fc.string({ minLength: 1, maxLength: 36 }),
    events: fc.constant([]),
    contextSequenceId: fc.option(fc.nat(), { nil: undefined }),
  }),
);
