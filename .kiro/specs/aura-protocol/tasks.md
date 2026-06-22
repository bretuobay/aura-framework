# Implementation Plan: @aura/protocol

## Overview

Implement the `@aura/protocol` npm package — the single source of truth for all AUIP v0 types, Zod schemas, validation contracts, and utility functions in the AURA TypeScript framework. The implementation proceeds from foundational enums and primitives, through domain schemas, to endpoint envelopes, utilities, barrel exports, and testing. Each task builds incrementally on the previous so there is no orphaned or unwired code.

## Tasks

- [x] 1. Set up project structure and build tooling
  - [x] 1.1 Initialize package and configure build
    - Create `package.json` with name `@aura/protocol`, version `0.1.0`, type `module`, dual CJS/ESM exports, and dependencies (`zod ^3.23.0`) and devDependencies (`tsup ^8.0.0`, `typescript ^5.4.0`, `vitest ^2.0.0`, `fast-check ^3.19.0`)
    - Create `tsconfig.json` with strict mode, ESNext module, NodeNext module resolution, declaration output
    - Create `tsup.config.ts` with entry `src/index.ts`, formats `cjs` and `esm`, `dts: true`, `clean: true`, `splitting: false`
    - Create `vitest.config.ts` with default configuration
    - Create `src/` directory structure
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 2. Implement foundational modules (enums and common primitives)
  - [x] 2.1 Implement `src/enums.ts`
    - Define Zod enums and inferred types for: `RiskClass`, `PrescriptionMode`, `NetworkQuality`, `LatencyClass`, `LayoutStrategy`, `AdaptationType`, `FeedbackAction`, `ProfileProvenance`, `CorrectionAction`, `DataClass`, `AccessibilitySetting`, `LayoutType`
    - Export both schemas and inferred TypeScript types
    - _Requirements: 1.3, 1.4_

  - [x] 2.2 Implement `src/common.ts`
    - Define `NonEmptyString` (`z.string().min(1)`), `ISOTimestamp` (refined string validating ISO 8601), `Confidence` (`z.number().min(0).max(1)`), `ContextSequenceId` (`z.number().int().nonneg()`), `SessionId` (alias for `NonEmptyString`)
    - Export all shared primitives
    - _Requirements: 1.2, 14.3_

- [x] 3. Implement domain schema modules (layer 1 — no cross-domain imports)
  - [x] 3.1 Implement `src/consent.ts`
    - Define `DataClassSchema` re-exporting the `DataClass` enum from enums
    - Define `ConsentProfileSchema` as a partial record of `DataClass` → `boolean`
    - Export `ConsentProfile` type and schema
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 3.2 Implement `src/context.ts`
    - Define `ContextModelSchema` with required `device` (non-empty string), `locale` (non-empty string, max 35 chars), optional `viewport` (width/height positive integers in [1, 32767]), optional `networkQuality` (enum), optional `sequenceId` (non-negative integer), optional `taskState` and `domain` (Record<string, unknown>)
    - Export `ContextModel` type and schema
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 3.3 Implement `src/event.ts`
    - Define `AuraEventSchema` with `type` (non-empty string), `surfaceId` (non-empty string), `timestamp` (ISO timestamp), `payload` (JSON object), optional `dataClasses` (array of DataClass)
    - Export `MinimumEventVocabulary` constant with the 5 required event types
    - Export `AuraEvent` type and schema
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 3.4 Implement `src/explanation.ts`
    - Define `ExplanationRecordSchema` with `id` (non-empty string), `summary` (non-empty string), `userVisible` (boolean), `factors` (string array, empty allowed), `confidence` ([0, 1])
    - Export `ExplanationRecord` type and schema
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 3.5 Implement `src/feedback.ts`
    - Define `FeedbackEventSchema` with `prescriptionId` (non-empty string), `action` (FeedbackAction enum), `timestamp` (ISO timestamp), optional `reason` (non-empty string when present), optional `contextSequenceId` (non-negative integer)
    - Export `FeedbackEvent` type and schema
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 3.6 Implement `src/adaptation.ts`
    - Define `AdaptationSchema` as a Zod discriminated union on `type` field with 6 members: `rank`, `componentVariant`, `layout`, `content`, `accessibility`, `filter`
    - Each variant requires `reasonCode` as non-empty string
    - Export `Adaptation` type and schema
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 3.7 Implement `src/profile.ts`
    - Define `ProfileAttributeSchema` with `id`, `key`, `value`, `provenance` (enum), `confidence` ([0, 1]), `dataClass` (DataClass enum), optional `expiresAt` (ISO timestamp)
    - Define `ProfileCorrectionSchema` as discriminated union on `action`: `remove` (requires `attributeId`) and `correct` (requires `attributeId` + non-empty `newValue`)
    - Export types and schemas
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 4. Implement domain schema modules (layer 2 — cross-domain imports)
  - [x] 4.1 Implement `src/manifest.ts`
    - Define `LayoutStabilitySchema` with `strategy` (LayoutStrategy enum) and conditional `maxDecisionWaitMs` (required for `reserve-space`/`skeleton`, non-negative integer ≤ 5000)
    - Define `ManifestComponentSchema` with `componentId`, `variants` (non-empty array), optional `adaptableProps`, `riskClass` (enum), optional `constraints` with `requiresConsent` (DataClass[]) and `reversible` (boolean)
    - Define `ManifestSurfaceSchema` with `surfaceId`, `components`, optional `layoutStability`, optional `consentRequirements`
    - Define `CapabilityManifestSchema` with optional `version` (non-empty when present), `surfaces`
    - Export all types and schemas
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [x] 4.2 Implement `src/prescription.ts`
    - Define `ContextLockSchema` with `sequenceId` (non-negative integer) and `capturedAt` (ISO timestamp)
    - Define `AdaptationGroupSchema` with `groupId` (non-empty), `adaptationIds` (non-empty string[]), `atomic` (boolean)
    - Define `UIPrescriptionSchema` with all required fields: `id`, `surfaceId`, `mode`, `latencyClass`, `contextLock`, `adaptations` (non-empty array of Adaptation), `constraints.expiresAt`, `manifestVersion`, `audit`, optional `explanation`, optional `adaptationGroups`
    - Export types and schemas
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15_

- [x] 5. Implement utility and error modules
  - [x] 5.1 Implement `src/errors.ts`
    - Define `ValidationErrorItem` interface with `path`, `message`, optional `code`
    - Define `ValidationResult<T>` discriminated union type
    - Implement `parseSchema<T>` function wrapping `schema.safeParse()` into structured result
    - Export all types and function
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 5.2 Implement `src/utils.ts`
    - Implement `isPrescriptionExpired(prescription, now)`: returns `true` if `expiresAt` is before `now`, missing, or invalid; never throws
    - Implement `isPrescriptionContextStale(prescription, currentContextSequenceId)`: returns `true` if sequenceIds differ or input is invalid; never throws
    - Export both functions
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

- [x] 6. Implement endpoint schemas and barrel export
  - [x] 6.1 Implement `src/endpoints.ts`
    - Define all 9 request schemas: `SessionRequestSchema`, `EventsRequestSchema`, `ContextRequestSchema`, `PrescriptionsStreamRequestSchema`, `FeedbackRequestSchema`, `ExplainRequestSchema`, `ConsentRequestSchema`, `ProfileRequestSchema`, `ProfileCorrectionRequestSchema`
    - Define all 9 response schemas: `SessionResponseSchema`, `EventsResponseSchema`, `ContextResponseSchema`, `PrescriptionsStreamResponseSchema`, `FeedbackResponseSchema`, `ExplainResponseSchema`, `ConsentResponseSchema`, `ProfileResponseSchema`, `ProfileCorrectionResponseSchema`
    - Compose from core object schemas (e.g. `SessionRequestSchema` references `CapabilityManifestSchema`, `ConsentProfileSchema`, `ContextModelSchema`)
    - Export all schemas and inferred types
    - _Requirements: 1.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11_

  - [x] 6.2 Implement `src/index.ts` barrel
    - Re-export all types, schemas, constants, and utility functions from all modules
    - Verify single entry point (no sub-path imports required)
    - _Requirements: 1.1, 1.6, 1.7, 1.8_

- [x] 7. Checkpoint - Verify build and no circular imports
  - Ensure `tsup` builds successfully producing dual CJS/ESM output with declarations
  - Verify no Node.js built-in imports in source modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement fast-check arbitraries (test generators)
  - [x] 8.1 Implement `src/__tests__/arbitraries/primitives.arb.ts`
    - Create `arbISOTimestamp()`, `arbNonISOString()`, `arbNonEmptyString()`, `arbConfidence()`, `arbContextSequenceId()`, `arbInvalidEnumValue(validSet)`
    - _Requirements: 3.4, 5.4, 5.5, 9.3_

  - [x] 8.2 Implement `src/__tests__/arbitraries/` for domain objects
    - Create `manifest.arb.ts` (`arbCapabilityManifest()`, `arbManifestSurface()`, `arbManifestComponent()`, `arbLayoutStability()`)
    - Create `event.arb.ts` (`arbAuraEvent()`)
    - Create `context.arb.ts` (`arbContextModel()`)
    - Create `prescription.arb.ts` (`arbUIPrescription()`, `arbContextLock()`, `arbAdaptationGroup()`)
    - Create `adaptation.arb.ts` (`arbAdaptation()` covering all 6 discriminated union members)
    - Create `feedback.arb.ts` (`arbFeedbackEvent()`)
    - Create `consent.arb.ts` (`arbConsentProfile()`)
    - Create `profile.arb.ts` (`arbProfileAttribute()`)
    - Create `explanation.arb.ts` (`arbExplanationRecord()`)
    - Create `correction.arb.ts` (`arbProfileCorrection()`)
    - Create `endpoints.arb.ts` (`arbEndpointRequest(endpoint)` for each of 9 endpoints)
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.9_

- [ ] 9. Implement property-based tests (Properties 1–9)
  - [ ]* 9.1 Write property test for round-trip serialization (Property 1)
    - **Property 1: Round-Trip Serialization**
    - Test that `JSON.stringify(obj)` → `JSON.parse()` → `schema.parse()` produces deeply equal result for all core schemas
    - **Validates: Requirements 3.7, 4.8, 5.11, 7.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8**

  - [ ]* 9.2 Write property test for idempotent parsing (Property 2)
    - **Property 2: Idempotent Parsing**
    - Test that `parse(parse(x))` equals `parse(x)` for all core schemas
    - **Validates: Requirements 2.8, 3.6, 4.7, 5.10, 6.9, 7.6, 8.5, 9.6, 10.6, 11.5, 12.11**

  - [ ]* 9.3 Write property test for valid objects parsing successfully (Property 3)
    - **Property 3: Valid Objects Parse Successfully**
    - Test that generated valid objects always parse without error
    - **Validates: Requirements 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.9**

  - [ ]* 9.4 Write property test for enum field rejection (Property 4)
    - **Property 4: Enum Field Rejection**
    - Test that invalid enum values always produce failures across all enum-constrained fields
    - **Validates: Requirements 2.3, 4.4, 5.6, 5.7, 6.8, 7.2, 8.4, 9.2, 9.5, 10.2**

  - [ ]* 9.5 Write property test for confidence range enforcement (Property 5)
    - **Property 5: Confidence Range Enforcement**
    - Test that values outside [0, 1] always produce failures for Confidence fields
    - **Validates: Requirements 5.5, 9.3, 11.2**

  - [ ]* 9.6 Write property test for ISO timestamp format enforcement (Property 6)
    - **Property 6: ISO Timestamp Format Enforcement**
    - Test that non-ISO strings always produce failures for ISO timestamp fields
    - **Validates: Requirements 3.4, 4.8, 5.4, 5.9, 9.4**

  - [ ]* 9.7 Write property test for DataClass key validation (Property 7)
    - **Property 7: DataClass Key Validation**
    - Test that unrecognized DataClass strings always produce failures
    - **Validates: Requirements 2.12, 3.10, 5.13, 8.4, 9.5, 17.3**

  - [ ]* 9.8 Write property test for non-empty string enforcement (Property 8)
    - **Property 8: Non-Empty String Enforcement**
    - Test that empty strings in non-empty-string fields always produce failures
    - **Validates: Requirements 2.7, 3.2, 5.12, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.5, 10.5, 11.4, 14.3**

  - [ ]* 9.9 Write property test for adaptation discriminated union (Property 9)
    - **Property 9: Adaptation Discriminated Union Correctness**
    - Test that valid adaptations resolve to correct subtype with expected fields
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

- [ ] 10. Implement property-based tests (Properties 10–17)
  - [ ]* 10.1 Write property test for ProfileCorrection discriminated union (Property 10)
    - **Property 10: ProfileCorrection Discriminated Union Correctness**
    - Test `correct` requires non-empty `newValue`, `remove` succeeds with or without `newValue`
    - **Validates: Requirements 10.1, 10.3, 10.4**

  - [ ]* 10.2 Write property test for prescription expiry monotonicity (Property 11)
    - **Property 11: Prescription Expiry Monotonicity**
    - Test that once expired at time `d1`, remains expired for all `d2 > d1`
    - **Validates: Requirements 16.2, 16.3, 16.5, 16.6**

  - [ ]* 10.3 Write property test for context staleness (Property 12)
    - **Property 12: Context Staleness Correctness**
    - Test that staleness returns false only when sequenceIds match exactly
    - **Validates: Requirements 16.8, 16.9, 16.10**

  - [ ]* 10.4 Write property test for ConsentProfile any-subset validity (Property 13)
    - **Property 13: ConsentProfile Any-Subset Validity**
    - Test that any subset of DataClass keys mapped to booleans parses successfully
    - **Validates: Requirements 8.1, 8.3, 8.6**

  - [ ]* 10.5 Write property test for structured validation errors (Property 14)
    - **Property 14: Validation Errors Are Structured and Descriptive**
    - Test that invalid inputs produce errors with `path` and `message` properties
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

  - [ ]* 10.6 Write property test for LayoutStability conditional requirement (Property 15)
    - **Property 15: LayoutStability Conditional Requirement**
    - Test that `reserve-space`/`skeleton` strategies fail without `maxDecisionWaitMs`
    - **Validates: Requirements 2.9, 2.10**

  - [ ]* 10.7 Write property test for FeedbackEvent collects all errors (Property 16)
    - **Property 16: FeedbackEvent Collects All Errors**
    - Test that multiple invalid fields produce error items for each field
    - **Validates: Requirements 7.3**

  - [ ]* 10.8 Write property test for open payload contract (Property 17)
    - **Property 17: Open Payload Contract**
    - Test that any JSON-serializable object as `payload` results in successful parsing
    - **Validates: Requirements 3.5, 3.9**

- [ ] 11. Implement example-based unit tests
  - [ ]* 11.1 Write unit tests for manifest validation
    - Test valid manifests, missing fields, invalid riskClass, variant validation, layoutStability boundaries (0, 5000, 5001), consent requirement DataClass validation
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.9, 2.10, 2.12, 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ]* 11.2 Write unit tests for event, context, and consent schemas
    - Test valid events, missing type/surfaceId/timestamp, MinimumEventVocabulary constant, extensible event types, valid contexts, viewport boundary values (1, 32767, 32768), locale max length (35), empty ConsentProfile
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.3_

  - [ ]* 11.3 Write unit tests for prescription, adaptation, and explanation schemas
    - Test valid prescriptions, missing required fields, empty adaptations array, invalid mode/latencyClass, contextLock validation, adaptationGroups, all 6 adaptation subtypes, missing reasonCode, explanation confidence boundaries
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 5.8, 5.12, 5.15, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 11.4 Write unit tests for feedback, profile, correction, and utility modules
    - Test valid feedback events, invalid actions, machine-readable reason strings (`stale-context`, `manifest-mismatch`, etc.), ProfileAttribute provenance/confidence/dataClass, ProfileCorrection `remove` ignoring `newValue`, `isPrescriptionExpired` with missing/invalid expiresAt, `isPrescriptionContextStale` with negative/non-integer input
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.8, 7.9, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 16.1, 16.2, 16.3, 16.4, 16.7, 16.8, 16.9, 16.10_

  - [ ]* 11.5 Write unit tests for endpoint schemas
    - Test all 9 request schemas accept valid input, reject missing fields, and all 9 response schemas validate correctly
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10_

- [x] 12. Final checkpoint - Verify full build and test suite
  - Run `tsup` build, verify dual CJS/ESM output with `.d.ts` declarations
  - Run `vitest --run` to ensure all tests pass
  - Verify no circular imports among source modules
  - Verify no Node.js built-in imports in runtime code
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript with Zod schemas, tsup for builds, Vitest for testing, and fast-check for property-based tests
- All source modules avoid Node.js built-ins to maintain cross-environment compatibility
- The module dependency graph is strictly acyclic: enums/common → domain schemas → endpoint schemas → barrel

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"] },
    { "id": 3, "tasks": ["4.1", "4.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.8"] },
    { "id": 10, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] }
  ]
}
```
