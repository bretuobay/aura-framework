import fc from 'fast-check';
import type { AuraEvent } from '@aura/protocol';

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 50 });

const arbISOTimestamp = fc.date({
  min: new Date('2020-01-01T00:00:00Z'),
  max: new Date('2030-01-01T00:00:00Z'),
}).map(d => d.toISOString());

const arbPayload = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))
);

const dataClasses = [
  "behavior", "personalization", "accessibility", "approximateLocation",
  "health", "education", "demographics", "emotion",
  "sensitiveInference", "cloudModelUse", "aggregation", "retention",
] as const;

const arbDataClasses = fc.array(fc.constantFrom(...dataClasses), { maxLength: 5 });

export const arbAuraEvent: fc.Arbitrary<AuraEvent> = fc.record({
  type: arbNonEmptyString,
  surfaceId: arbNonEmptyString,
  timestamp: arbISOTimestamp,
  payload: arbPayload,
  dataClasses: fc.option(arbDataClasses, { nil: undefined }),
});
