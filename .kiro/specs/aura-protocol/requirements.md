# Requirements Document

## Introduction

`@aura/protocol` is the source of truth for all AUIP v0 types, schemas, and validation contracts in the AURA TypeScript framework. It defines the typed capability boundary between host applications, the AURA frontend SDK, server route handlers, the rules engine, and devtools. Every other `@aura/*` package depends on `@aura/protocol` for type safety and runtime validation.

The package must be usable in browser SDKs, React bindings, server route handlers (Hono/Node), test suites, and devtools without introducing Node.js-only or browser-only runtime dependencies. It must expose Zod-based schemas (or an equivalent TypeScript-friendly schema library) so that consumers can both infer static TypeScript types and perform runtime validation from a single source of truth.

AUIP v0 is the Adaptive UI Protocol described in the AURA reference architecture. Its core objects are: `CapabilityManifest`, `AuraEvent`, `ContextModel`, `ContextLock`, `ConsentProfile`, `UIPrescription`, `Adaptation`, `ExplanationRecord`, `ProfileAttribute`, and `FeedbackEvent`. The protocol also covers AUIP endpoint request and response envelopes for all nine AUIP v0 routes. AUIP is a progressive-enhancement contract: malformed manifests, invalid prescriptions, stale context locks, consent violations, or manifest-version mismatches must be representable as typed rejections so that host applications can continue rendering their default UI.

---

## Glossary

- **AUIP**: Adaptive UI Protocol. The JSON-over-HTTP + SSE protocol that governs all communication between host applications and the AURA middleware.
- **Protocol_Package**: The `@aura/protocol` npm package. The source of truth for all AUIP v0 schemas, types, and validation contracts.
- **CapabilityManifest**: A host-authored declaration of the surfaces, components, variants, props, risk classes, consent requirements, and layout-stability constraints that AURA may influence.
- **ManifestVersion**: A non-empty manifest version string pinned to an AUIP session; prescriptions carrying a different version are rejected rather than migrated in place.
- **ManifestSurface**: A named surface within a `CapabilityManifest`, representing a distinct UI area (e.g. `search.results`).
- **ManifestComponent**: A typed component entry within a `CapabilityManifest`, declaring variants, adaptable props, risk class, and constraints.
- **AuraEvent**: A typed interaction, behavioral, task, or domain event emitted by the host application into AUIP.
- **MinimumEventVocabulary**: The standard event type set required by AUIP v0: `surface.viewed`, `interaction.clicked`, `interaction.dismissed`, `feedback.submitted`, and `context.changed`.
- **ContextModel**: A structured snapshot of the current device, viewport, locale, network, task state, and domain context.
- **ContextLock**: A temporal validity guard on a `UIPrescription`, containing the context sequence ID and timestamp captured when the prescription was evaluated.
- **LayoutStability**: Optional surface-level manifest metadata describing how an adaptive surface prevents disruptive reflow, including a strategy and maximum decision wait.
- **ConsentProfile**: A map of data class keys to boolean consent values that governs what AURA may collect, infer, retain, and use.
- **UIPrescription**: A bounded recommendation produced by AURA that advises the host application to apply one or more `Adaptation` entries to a declared surface.
- **Adaptation**: A single typed change within a `UIPrescription`. The discriminated union type covers `rank`, `componentVariant`, `layout`, `content`, `accessibility`, and `filter` adaptation types.
- **AdaptationGroup**: An optional grouping key for independent adaptation subsets. Validation is atomic for a whole prescription unless groups are explicitly declared and validated independently.
- **ExplanationRecord**: Audience-specific rationale attached to a `UIPrescription`, including user-visible summary, developer context, and auditor metadata.
- **ProfileAttribute**: A single adaptive attribute stored in the AURA user model, with provenance, confidence, optional expiry, and data class.
- **FeedbackEvent**: A signal from the host application recording how a user or the host responded to a `UIPrescription` (accept, dismiss, override, undo, reject, or error).
- **RiskClass**: An enumerated governance tier (`low`, `medium`, `high`, `critical`) controlling default prescription mode, explanation behavior, and human confirmation requirements.
- **PrescriptionMode**: An enumerated delivery mode (`recommend`, `autoApply`, `askUser`, `observeOnly`) specifying how a `UIPrescription` should be applied.
- **Schema**: A Zod schema object (or equivalent) that provides both runtime parsing/validation and static TypeScript type inference.
- **Validator**: A function exported by `Protocol_Package` that accepts an unknown value and returns a typed parse result (success with typed data, or failure with descriptive error).
- **DataClass**: A named category of user data governed by consent (e.g. `behavior`, `personalization`, `accessibility`, `approximateLocation`, `health`, `education`, `demographics`, `emotion`, `sensitiveInference`, `cloudModelUse`, `aggregation`, `retention`).
- **ISO_Timestamp**: A string in ISO 8601 format (e.g. `2024-01-15T10:30:00.000Z`) representing a point in time.
- **Confidence**: A floating-point number in the closed interval [0, 1] representing the certainty of an inferred value.
- **ContextSequenceId**: A non-negative integer that advances when the host application context changes and is used to reject stale prescriptions.

---

## Requirements

### Requirement 1: Core Type and Schema Exports

**User Story:** As a developer building any `@aura/*` package or host integration, I want to import all AUIP v0 core types and schemas from a single package, so that I have one source of truth and no circular dependencies.

#### Acceptance Criteria

1. THE `Protocol_Package` SHALL export the TypeScript types `CapabilityManifest`, `ManifestSurface`, `ManifestComponent`, `LayoutStability`, `AuraEvent`, `ContextModel`, `ContextLock`, `ConsentProfile`, `UIPrescription`, `Adaptation`, `AdaptationGroup`, `ExplanationRecord`, `ProfileAttribute`, `FeedbackEvent`, `RiskClass`, and `PrescriptionMode`.
2. THE `Protocol_Package` SHALL export Zod schemas named `CapabilityManifestSchema`, `LayoutStabilitySchema`, `AuraEventSchema`, `ContextModelSchema`, `ContextLockSchema`, `ConsentProfileSchema`, `UIPrescriptionSchema`, `AdaptationSchema`, `AdaptationGroupSchema`, `ExplanationRecordSchema`, `ProfileAttributeSchema`, and `FeedbackEventSchema`; the TypeScript type inferred from each schema via `z.infer<typeof XSchema>` SHALL be structurally identical to the corresponding exported TypeScript type, verified by the `.parse()` return type.
3. THE `Protocol_Package` SHALL export the `RiskClass` enumeration with values `low`, `medium`, `high`, and `critical`.
4. THE `Protocol_Package` SHALL export the `PrescriptionMode` enumeration with values `recommend`, `autoApply`, `askUser`, and `observeOnly`.
5. THE `Protocol_Package` SHALL export both request and response schemas for all nine AUIP v0 endpoints using the naming conventions `<EndpointName>RequestSchema` and `<EndpointName>ResponseSchema` (e.g. `SessionRequestSchema`, `SessionResponseSchema`), covering `/aura/session`, `/aura/events`, `/aura/context`, `/aura/prescriptions/stream`, `/aura/feedback`, `/aura/explain/:id`, `/aura/consent`, `/aura/profile`, and `/aura/profile/correction`.
6. THE `Protocol_Package` SHALL export all types and schemas from a single entry point without requiring consumers to import from sub-paths.
7. THE `Protocol_Package` SHALL NOT import Node.js built-in modules, so that the package is usable in browser environments without bundler shims.
8. WHEN a static import graph analysis is performed on `Protocol_Package`, THE analysis SHALL find no circular import paths among the package's own source modules.

---

### Requirement 2: CapabilityManifest Validation

**User Story:** As a server route handler or capability registry, I want to validate an incoming manifest at session initialization time, so that I can reject malformed manifests before they enter the rules pipeline or prescription engine.

#### Acceptance Criteria

1. WHEN a valid `CapabilityManifest` object is provided, THE `Protocol_Package` SHALL parse it successfully and return a typed `CapabilityManifest` value with all declared fields accessible.
2. WHEN a `CapabilityManifest` is missing required fields, THE `Protocol_Package` SHALL return a validation failure identifying all missing field names in the error result.
3. WHEN a `CapabilityManifest` contains a component whose `riskClass` value is not one of `low`, `medium`, `high`, or `critical`, THE `Protocol_Package` SHALL return a validation failure.
4. WHEN a `ManifestComponent.adaptableProps` schema is present and a props patch object satisfies the declared constraints, THE `Protocol_Package` SHALL accept the patch and return a validation success; IF the patch violates a declared constraint, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN a `ManifestComponent` is present in the manifest, THE `Protocol_Package` SHALL validate that it declares at least one non-empty variant string; IF no variant string is present, THE `Protocol_Package` SHALL return a validation failure.
6. WHEN no `ManifestComponent` is present in the manifest, THE `Protocol_Package` SHALL skip variant validation and parse the manifest successfully if all other fields are valid.
7. WHEN a `CapabilityManifest` is provided with an optional `version` field, THE `Protocol_Package` SHALL accept any non-empty string as a valid version identifier.
8. WHEN a valid `CapabilityManifest` value `m` is parsed through the `CapabilityManifestSchema` and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).
9. WHEN a `ManifestSurface` declares `layoutStability`, THE `Protocol_Package` SHALL validate that `layoutStability.strategy` is one of `none`, `reserve-space`, `skeleton`, or `host-default`, and that `layoutStability.maxDecisionWaitMs`, when present, is a non-negative integer no greater than 5000.
10. WHEN a `ManifestSurface.layoutStability.strategy` is `reserve-space` or `skeleton`, THE `Protocol_Package` SHALL accept the surface only if `maxDecisionWaitMs` is present; IF it is missing, THE `Protocol_Package` SHALL return a validation failure identifying `layoutStability.maxDecisionWaitMs`.
11. WHEN a `CapabilityManifest` declares a `version`, THE `Protocol_Package` SHALL preserve that exact string during parsing and serialization so that servers can pin sessions to that manifest version.
12. WHEN a `CapabilityManifest` declares surface or component consent requirements, THE `Protocol_Package` SHALL validate that every referenced key is one of the recognized `DataClass` values.

---

### Requirement 3: AuraEvent Validation

**User Story:** As an event gateway or rules engine consumer, I want to validate event payload envelopes before processing, so that malformed or spoofed events do not enter the adaptation pipeline.

#### Acceptance Criteria

1. WHEN a valid `AuraEvent` object is provided with `type` as a non-empty string, `surfaceId` as a non-empty string, `timestamp` as a valid `ISO_Timestamp` string, and `payload` as a JSON-serializable object (not a primitive), THE `Protocol_Package` SHALL parse it successfully and return a typed `AuraEvent` value.
2. WHEN an `AuraEvent` is missing the `type` field or `type` is an empty string, THE `Protocol_Package` SHALL return a validation failure.
3. WHEN an `AuraEvent` is missing the `surfaceId` field, THE `Protocol_Package` SHALL return a validation failure.
4. WHEN an `AuraEvent` is missing the `timestamp` field or `timestamp` is not a valid `ISO_Timestamp` string, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN an `AuraEvent` has a `payload` field that is a JSON-serializable object, THE `Protocol_Package` SHALL accept the payload without requiring a specific payload shape (open payload contract for extensibility).
6. WHEN a valid `AuraEvent` value `e` is parsed through the `AuraEventSchema` and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).
7. WHEN a valid `AuraEvent` value `e` is serialized to JSON via `JSON.stringify(e)` and then parsed back through `AuraEventSchema`, THE parsed result SHALL have identical field values to `e` (round-trip serialization).
8. THE `Protocol_Package` SHALL export a `MinimumEventVocabulary` constant containing `surface.viewed`, `interaction.clicked`, `interaction.dismissed`, `feedback.submitted`, and `context.changed`.
9. WHEN an `AuraEvent.type` is not in `MinimumEventVocabulary`, THE `Protocol_Package` SHALL still accept it as a valid domain event if it is a non-empty string; domain-specific event names are extensible and application-owned.
10. WHEN an `AuraEvent` includes optional `dataClasses` metadata, THE `Protocol_Package` SHALL validate every entry as a recognized `DataClass` value so that gateways can filter payload fields before rules evaluation.

---

### Requirement 4: ContextModel Validation

**User Story:** As a context manager or rules engine, I want to validate context envelopes before updating the session context model, so that invalid context data does not corrupt adaptation decisions.

#### Acceptance Criteria

1. WHEN a `ContextModel` object is provided with `device` as a non-empty string and `locale` as a valid BCP 47 language tag (max 35 characters), THE `Protocol_Package` SHALL parse it successfully and return a typed `ContextModel` value.
2. WHEN a `ContextModel` is missing the `device` or `locale` field, THE `Protocol_Package` SHALL return a validation failure identifying the missing fields.
3. WHEN a `ContextModel` contains an optional `viewport` field with `viewport.width` and `viewport.height` present, THE `Protocol_Package` SHALL validate that both are positive integers in the range [1, 32767]; IF either value is outside this range or is not an integer, THE `Protocol_Package` SHALL return a validation failure.
4. WHEN a `ContextModel` contains an optional `networkQuality` field, THE `Protocol_Package` SHALL accept only the values `offline`, `slow`, `moderate`, and `fast`; IF `networkQuality` is any other value, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN a `ContextModel` contains an optional `sequenceId` field, THE `Protocol_Package` SHALL validate it as a non-negative integer.
6. WHEN a `ContextModel` is provided without optional fields, THE `Protocol_Package` SHALL parse it successfully provided `device` and `locale` are valid.
7. WHEN a valid `ContextModel` value `c` is parsed through the `ContextModelSchema` and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).
8. WHEN a valid `ContextModel` value `c` is serialized to JSON via `JSON.stringify(c)` and parsed back through `ContextModelSchema`, THE parsed result SHALL have identical field values to `c` (round-trip serialization).

---

### Requirement 5: UIPrescription Validation

**User Story:** As a prescription engine or capability registry, I want to validate prescription shapes before emitting them to host SDKs, so that invalid prescriptions never reach the host application renderer.

#### Acceptance Criteria

1. WHEN a valid `UIPrescription` object is provided with all required fields, THE `Protocol_Package` SHALL parse it successfully and return a typed `UIPrescription` value.
2. WHEN a `UIPrescription` is missing required fields (`id`, `surfaceId`, `mode`, `latencyClass`, `contextLock`, `adaptations`, `constraints.expiresAt`, `manifestVersion`, or `audit`), THE `Protocol_Package` SHALL return a validation failure identifying the missing fields.
3. IF a `UIPrescription.adaptations` array is empty, THE `Protocol_Package` SHALL return a validation failure.
4. IF `UIPrescription.constraints.expiresAt` is not a valid `ISO_Timestamp` string, THE `Protocol_Package` SHALL return a validation failure.
5. IF `UIPrescription.explanation` is present and `UIPrescription.explanation.confidence` is not in the closed interval [0, 1], THE `Protocol_Package` SHALL return a validation failure.
6. WHEN a `UIPrescription` has a `mode` value that is not a valid `PrescriptionMode`, THE `Protocol_Package` SHALL return a validation failure.
7. WHEN a `UIPrescription` has a `latencyClass` value that is not one of `immediate`, `fast`, or `deliberate`, THE `Protocol_Package` SHALL return a validation failure.
8. WHEN a `UIPrescription.contextLock.sequenceId` is missing, negative, or not an integer, THE `Protocol_Package` SHALL return a validation failure identifying `contextLock.sequenceId`.
9. WHEN a `UIPrescription.contextLock.capturedAt` is missing or is not a valid `ISO_Timestamp` string, THE `Protocol_Package` SHALL return a validation failure identifying `contextLock.capturedAt`.
10. WHEN a valid `UIPrescription` value `p` is parsed through the `UIPrescriptionSchema` and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).
11. WHEN a valid `UIPrescription` value `p` is serialized to JSON via `JSON.stringify(p)` and parsed back through `UIPrescriptionSchema`, THE parsed result SHALL have identical field values to `p` (round-trip serialization).
12. IF `UIPrescription.manifestVersion` is present but is an empty string, THE `Protocol_Package` SHALL return a validation failure identifying `manifestVersion`.
13. WHEN `UIPrescription.audit.dataClassesUsed` is present, THE `Protocol_Package` SHALL validate every entry as a recognized `DataClass` value.
14. WHEN `UIPrescription.audit.policyVersion` or `UIPrescription.audit.decisionSource` is present, THE `Protocol_Package` SHALL validate each as a non-empty string.
15. WHEN a `UIPrescription` declares `adaptationGroups`, THE `Protocol_Package` SHALL validate that each group has a non-empty `groupId`, non-empty `adaptationIds`, and an `atomic` boolean; otherwise the whole prescription is treated as a single atomic group by server and SDK consumers.

---

### Requirement 6: Adaptation Discriminated Union Validation

**User Story:** As a prescription engine, I want each adaptation entry to be validated against its specific subtype shape, so that type-incorrect adaptations are rejected before reaching the host application.

#### Acceptance Criteria

1. THE `Protocol_Package` SHALL validate `Adaptation` entries as a discriminated union on the `type` field with members `rank`, `componentVariant`, `layout`, `content`, `accessibility`, and `filter`.
2. WHEN an `Adaptation` has `type: "rank"`, THE `Protocol_Package` SHALL validate that `orderedIds` is a non-empty array of strings and `reasonCode` is a non-empty string; IF `reasonCode` is missing or empty, THE `Protocol_Package` SHALL return a validation failure even when all other functional fields are valid.
3. WHEN an `Adaptation` has `type: "componentVariant"`, THE `Protocol_Package` SHALL validate that `slotId`, `componentId`, `variant`, and `reasonCode` are all non-empty strings; IF `reasonCode` is missing or empty, THE `Protocol_Package` SHALL return a validation failure.
4. WHEN an `Adaptation` has `type: "layout"`, THE `Protocol_Package` SHALL validate that `layout` is one of `compact`, `expanded`, `step-by-step`, or `accessible`, and `reasonCode` is a non-empty string; IF `reasonCode` is missing or empty, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN an `Adaptation` has `type: "content"`, THE `Protocol_Package` SHALL validate that `target`, `contentKey`, `content`, and `reasonCode` are all non-empty strings; IF `reasonCode` is missing or empty, THE `Protocol_Package` SHALL return a validation failure.
6. WHEN an `Adaptation` has `type: "accessibility"`, THE `Protocol_Package` SHALL validate that `setting` is one of `fontScale`, `contrast`, `motion`, or `inputMode`, that `value` is a string, number, or boolean, and that `reasonCode` is a non-empty string; IF `reasonCode` is missing or empty, THE `Protocol_Package` SHALL return a validation failure.
7. WHEN an `Adaptation` has `type: "filter"`, THE `Protocol_Package` SHALL validate that `target` and `reasonCode` are non-empty strings and `visibleFilters` is a non-empty array of strings; IF `reasonCode` is missing or empty, THE `Protocol_Package` SHALL return a validation failure.
8. WHEN an `Adaptation` has a `type` value not in the set `{ rank, componentVariant, layout, content, accessibility, filter }`, THE `Protocol_Package` SHALL return a validation failure.
9. FOR ALL valid `Adaptation` values `a`, parsing `a` through the `Adaptation` schema and then parsing the result a second time SHALL produce an equivalent value (idempotent validation).

---

### Requirement 7: FeedbackEvent Validation

**User Story:** As a feedback recording endpoint, I want to validate feedback envelopes before persisting them, so that malformed feedback does not corrupt the adaptation loop.

#### Acceptance Criteria

1. WHEN a valid `FeedbackEvent` object is provided with `prescriptionId` as a non-empty string, `action` as one of the allowed values, and `timestamp` as a valid `ISO_Timestamp` string, THE `Protocol_Package` SHALL parse it successfully and return a typed `FeedbackEvent` value.
2. WHEN a `FeedbackEvent.action` value is not one of `accept`, `dismiss`, `override`, `undo`, `reject`, or `error`, THE `Protocol_Package` SHALL return a validation failure.
3. WHEN a `FeedbackEvent` has multiple invalid fields, THE `Protocol_Package` SHALL collect all validation errors and return them together in a single failure result (not fail-fast).
4. WHEN a `FeedbackEvent` includes an optional `reason` field, THE `Protocol_Package` SHALL accept it only if it is a non-empty string; IF `reason` is present and is an empty string, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN a `FeedbackEvent` is missing the `prescriptionId` field or `prescriptionId` is an empty string, THE `Protocol_Package` SHALL return a validation failure.
6. WHEN a valid `FeedbackEvent` value `f` is parsed through the `FeedbackEventSchema` and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).
7. WHEN a valid `FeedbackEvent` value `f` is serialized to JSON via `JSON.stringify(f)` and parsed back through `FeedbackEventSchema`, THE parsed result SHALL have identical field values to `f` (round-trip serialization).
8. WHEN a `FeedbackEvent.reason` is `stale-context`, THE `Protocol_Package` SHALL accept it as a valid non-empty reason string and SHALL accept an optional `contextSequenceId` field when it is a non-negative integer.
9. WHEN a `FeedbackEvent.reason` is `manifest-mismatch`, `invalid-prescription`, `consent-revoked`, `policy-violation`, or `late-layout-changing-prescription`, THE `Protocol_Package` SHALL accept it as a valid machine-readable reason string.

---

### Requirement 8: ConsentProfile Validation

**User Story:** As a privacy and consent layer, I want to validate consent update payloads before applying them, so that partial or malformed consent updates do not silently corrupt the consent state.

#### Acceptance Criteria

1. WHEN a `ConsentProfile` object is provided with one or more recognized `DataClass` keys mapped to boolean values, THE `Protocol_Package` SHALL parse it successfully and return a typed `ConsentProfile` value.
2. THE `Protocol_Package` SHALL recognize the following core `DataClass` keys from the reference architecture: `behavior`, `personalization`, `accessibility`, `approximateLocation`, `health`, `education`, `demographics`, `emotion`, `sensitiveInference`, `cloudModelUse`, `aggregation`, and `retention`.
3. WHEN a `ConsentProfile` is provided as an empty object `{}`, THE `Protocol_Package` SHALL parse it successfully as a valid empty consent update.
4. WHEN a `ConsentProfile` contains a recognized `DataClass` key mapped to a non-boolean value, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN a `ConsentProfile` value `cp` is parsed through the `ConsentProfileSchema` and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).
6. WHEN a `ConsentProfile` is constructed from any subset of the recognized `DataClass` keys, each mapped to a boolean value, THE `Protocol_Package` SHALL parse it successfully.

---

### Requirement 9: ProfileAttribute Validation

**User Story:** As a user model store, I want to validate profile attributes before storing or exposing them, so that attributes with missing provenance, out-of-range confidence, or invalid expiry are rejected at the boundary.

#### Acceptance Criteria

1. WHEN a valid `ProfileAttribute` object is provided with `id`, `key`, `value`, `provenance`, `confidence`, and `dataClass` fields, THE `Protocol_Package` SHALL parse it successfully and return a typed `ProfileAttribute` value.
2. WHEN `ProfileAttribute.provenance` or `ProfileAttribute.source` is not one of `explicit`, `inferred`, or `imported`, THE `Protocol_Package` SHALL return a validation failure.
3. WHEN `ProfileAttribute.confidence` is not in the closed interval [0, 1], THE `Protocol_Package` SHALL return a validation failure.
4. WHEN a `ProfileAttribute` contains an optional `expiresAt` field that is not a valid `ISO_Timestamp` string, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN `ProfileAttribute.dataClass` is not one of the recognized `DataClass` values, THE `Protocol_Package` SHALL return a validation failure.
6. WHEN a valid `ProfileAttribute` value `pa` is parsed through the `ProfileAttributeSchema` and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).

---

### Requirement 10: Profile Correction Payload Validation

**User Story:** As a profile correction endpoint, I want to validate correction payloads before applying them, so that only well-formed corrections alter the user model.

#### Acceptance Criteria

1. WHEN a profile correction payload is provided with a non-empty `attributeId` string and a valid `action` value, THE `Protocol_Package` SHALL parse it successfully and return a typed correction value as a discriminated union on `action`.
2. WHEN the `action` field is not one of `remove` or `correct`, or when `action` or `attributeId` is missing, THE `Protocol_Package` SHALL return a validation failure.
3. WHEN `action` is `correct`, THE `Protocol_Package` SHALL validate that `newValue` is present and is a non-empty string; IF `newValue` is absent or is an empty string, THE `Protocol_Package` SHALL return a validation failure.
4. WHEN `action` is `remove`, THE `Protocol_Package` SHALL not require a `newValue` field; IF `newValue` is present alongside `action: "remove"`, THE `Protocol_Package` SHALL accept and ignore it.
5. WHEN `attributeId` is an empty string, THE `Protocol_Package` SHALL return a validation failure.
6. WHEN a valid profile correction payload `pc` is parsed through the correction schema and the result is parsed a second time, THE second parse SHALL produce a value with identical field values (deep structural equality) to the first parse result (idempotent validation).

---

### Requirement 11: ExplanationRecord Validation

**User Story:** As a prescription engine and explainability layer, I want to validate explanation records before attaching them to prescriptions, so that prescriptions never carry incomplete or structurally invalid explanations.

#### Acceptance Criteria

1. WHEN a valid `ExplanationRecord` is provided with `id` as a non-empty string, `summary` as a non-empty string, `userVisible` as a boolean, `factors` as an array of strings, and `confidence` as a value in [0, 1], THE `Protocol_Package` SHALL parse it successfully and return a typed `ExplanationRecord` value.
2. WHEN `ExplanationRecord.confidence` is provided and is not in the closed interval [0, 1], THE `Protocol_Package` SHALL return a validation failure identifying the `confidence` field.
3. IF `ExplanationRecord.factors` is not an array, THE `Protocol_Package` SHALL return a validation failure; IF `factors` is an empty array, THE `Protocol_Package` SHALL accept it as valid (passive explanations may have no factors).
4. IF `ExplanationRecord.summary` is an empty string or is absent, THE `Protocol_Package` SHALL return a validation failure.
5. WHEN a valid `ExplanationRecord` value is parsed through the `ExplanationRecordSchema` and the result is parsed a second time, THE second parse SHALL produce a value where all named fields have equal values to the first parse result (idempotent validation).

---

### Requirement 12: AUIP Endpoint Request and Response Schema Validation

**User Story:** As a server route handler, I want to parse and validate incoming AUIP request bodies and outgoing response envelopes against typed schemas, so that the server never processes malformed requests or emits malformed responses.

#### Acceptance Criteria

1. THE `Protocol_Package` SHALL export a `SessionRequestSchema` that validates a non-empty `sessionId` string, a non-empty `userId` string, a `manifest` field conforming to `CapabilityManifest`, a `consentProfile` field conforming to `ConsentProfile`, a `context` field conforming to `ContextModel`, and an optional `contextSequenceId` non-negative integer.
2. THE `Protocol_Package` SHALL export an `EventsRequestSchema` that validates a non-empty `sessionId` string, a non-empty `events` array of `AuraEvent` objects, and an optional `contextSequenceId` non-negative integer.
3. THE `Protocol_Package` SHALL export a `ContextRequestSchema` that validates a non-empty `sessionId` string, a `contextPatch` field conforming to a partial `ContextModel`, and a required `contextSequenceId` non-negative integer.
4. THE `Protocol_Package` SHALL export a `FeedbackRequestSchema` that validates a non-empty `sessionId` string and a `feedback` field conforming to `FeedbackEvent`.
5. THE `Protocol_Package` SHALL export a `ConsentRequestSchema` that validates a non-empty `sessionId` string and a `consentPatch` field conforming to `ConsentProfile`.
6. THE `Protocol_Package` SHALL export a `ProfileCorrectionRequestSchema` that validates a non-empty `sessionId` string and a `correction` field conforming to a profile correction payload.
7. THE `Protocol_Package` SHALL export a `SessionResponseSchema` that validates a non-empty `sessionId` string and a `status` field with values `active` or `rejected`.
8. THE `Protocol_Package` SHALL export response schemas for the remaining AUIP POST endpoints (`EventsResponseSchema`, `ContextResponseSchema`, `FeedbackResponseSchema`, `ConsentResponseSchema`, `ProfileCorrectionResponseSchema`), each including at minimum a `status` field.
9. WHEN any AUIP request body satisfies the corresponding schema, THE `Protocol_Package` SHALL parse it successfully and return a typed request value.
10. WHEN any AUIP request body is missing a required field or a required field has the wrong type, THE `Protocol_Package` SHALL return a validation failure with a descriptive error identifying the field path.
11. WHEN a valid AUIP request value `req` is parsed through the corresponding request schema and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).

---

### Requirement 13: Round-Trip Serialization Correctness

**User Story:** As a developer building serializers, transport layers, or log replayers, I want the guarantee that any valid AUIP object can be serialized to JSON and deserialized back to an equivalent typed object, so that no data is silently lost or mutated in transit.

#### Acceptance Criteria

1. WHEN a valid `CapabilityManifest` value `m` is serialized via `JSON.stringify(m)` and parsed back through `CapabilityManifestSchema`, THE parsed result SHALL have all fields with values deeply equal to `m`.
2. WHEN a valid `AuraEvent` value `e` is serialized via `JSON.stringify(e)` and parsed back through `AuraEventSchema`, THE parsed result SHALL have all fields with values deeply equal to `e`.
3. WHEN a valid `UIPrescription` value `p` is serialized via `JSON.stringify(p)` and parsed back through `UIPrescriptionSchema`, THE parsed result SHALL have all fields with values deeply equal to `p`.
4. WHEN a valid `FeedbackEvent` value `f` is serialized via `JSON.stringify(f)` and parsed back through `FeedbackEventSchema`, THE parsed result SHALL have all fields with values deeply equal to `f`.
5. WHEN a valid `ContextModel` value `c` is serialized via `JSON.stringify(c)` and parsed back through `ContextModelSchema`, THE parsed result SHALL have all fields with values deeply equal to `c`.
6. WHEN a valid `ConsentProfile` value `cp` is serialized via `JSON.stringify(cp)` and parsed back through `ConsentProfileSchema`, THE parsed result SHALL have all fields with values deeply equal to `cp`.
7. WHEN a valid `ProfileAttribute` value `pa` is serialized via `JSON.stringify(pa)` and parsed back through `ProfileAttributeSchema`, THE parsed result SHALL have all fields with values deeply equal to `pa`.
8. WHEN a valid AUIP request payload for any of the nine endpoints is serialized via `JSON.stringify(payload)` and parsed back through the corresponding request schema, THE parsed result SHALL have all fields with values deeply equal to the original payload.

---

### Requirement 14: Validation Error Quality

**User Story:** As a developer integrating `@aura/protocol`, I want validation failures to include descriptive error messages identifying what was wrong, so that I can diagnose and fix integration issues without reading schema source code.

#### Acceptance Criteria

1. WHEN any validator returns a failure, THE `Protocol_Package` SHALL include at least one human-readable error message in the failure result.
2. WHEN a required field is missing, THE `Protocol_Package` SHALL include all missing field names as a list within a single failure result (not returned individually across multiple calls).
3. WHEN a field value has an incorrect type, THE `Protocol_Package` SHALL identify the field path and the expected type in the error message.
4. WHEN a field value violates an enum constraint, THE `Protocol_Package` SHALL list all allowed values in the error message.
5. THE `Protocol_Package` SHALL expose a structured error type (not a plain string) containing at minimum an array of error items, where each item includes a `path` property identifying the field location and a `message` property with the human-readable description.

---

### Requirement 15: Cross-Environment Compatibility

**User Story:** As a developer using `@aura/protocol` in a browser SDK, a Hono server handler, a Vitest test suite, and a React devtools panel, I want the package to work identically in all four environments without bundler polyfills, so that I do not need environment-specific imports.

#### Acceptance Criteria

1. THE `Protocol_Package` SHALL NOT import or require any Node.js built-in modules (e.g. `fs`, `path`, `crypto`, `buffer`) in its runtime code.
2. THE `Protocol_Package` SHALL expose a CommonJS-compatible build (`main` or `exports["."].require` in `package.json`); IF the CJS build is absent, the package SHALL be considered incomplete.
3. THE `Protocol_Package` SHALL expose an ESM-compatible build (`module` or `exports["."].import` in `package.json`); IF the ESM build is absent, the package SHALL be considered incomplete.
4. THE `Protocol_Package` SHALL export TypeScript declaration files (`.d.ts`) alongside its compiled output.
5. WHEN the `Protocol_Package` is imported in a browser ESM environment, THE `Protocol_Package` SHALL not throw at import time.
6. WHEN the `Protocol_Package` is imported in a Node.js CommonJS environment, THE `Protocol_Package` SHALL not throw at import time.

---

### Requirement 16: Prescription Expiry Invariant

**User Story:** As a capability registry or SDK, I want to detect expired and context-stale prescriptions reliably, so that stale prescriptions are never applied after their declared expiry time or after the host context has advanced.

#### Acceptance Criteria

1. THE `Protocol_Package` SHALL export a function `isPrescriptionExpired(prescription: UIPrescription, now: Date): boolean`.
2. WHEN `prescription.constraints.expiresAt` represents a point in time strictly before `now`, THE `isPrescriptionExpired` function SHALL return `true`.
3. WHEN `prescription.constraints.expiresAt` represents a point in time equal to or after `now`, THE `isPrescriptionExpired` function SHALL return `false`.
4. WHEN `prescription.constraints.expiresAt` is absent or not a valid `ISO_Timestamp`, THE `isPrescriptionExpired` function SHALL return `true` (treat missing or invalid expiry as immediately expired).
5. WHEN `isPrescriptionExpired(p, d1)` returns `true` for a date `d1`, THEN for any date `d2` that is strictly after `d1`, `isPrescriptionExpired(p, d2)` SHALL also return `true` (monotone expiry — a prescription cannot un-expire).
6. WHEN `isPrescriptionExpired(p, d2)` returns `false` for a date `d2`, THEN for any date `d1` that is strictly before `d2`, `isPrescriptionExpired(p, d1)` SHALL also return `false`.
7. THE `Protocol_Package` SHALL export a function `isPrescriptionContextStale(prescription: UIPrescription, currentContextSequenceId: number): boolean`.
8. WHEN `prescription.contextLock.sequenceId` is not equal to `currentContextSequenceId`, THE `isPrescriptionContextStale` function SHALL return `true`.
9. WHEN `prescription.contextLock.sequenceId` equals `currentContextSequenceId`, THE `isPrescriptionContextStale` function SHALL return `false`.
10. WHEN `currentContextSequenceId` is negative or not an integer, THE `isPrescriptionContextStale` function SHALL return `true`.

---

### Requirement 17: Manifest Component Constraint Validation

**User Story:** As a capability registry, I want to validate that adaptable props declared in a `ManifestComponent` conform to their declared constraints, so that prescriptions referencing invalid prop patches are rejected at the boundary.

#### Acceptance Criteria

1. WHEN a `ManifestComponent.adaptableProps` schema is present and a props patch object satisfies all declared constraints, THE `Protocol_Package` SHALL return a validation success.
2. WHEN a `ManifestComponent.adaptableProps` schema is present and a props patch violates a declared constraint (e.g. a string exceeds `maxLength`), THE `Protocol_Package` SHALL return a validation failure identifying the violated constraint.
3. WHEN a `ManifestComponent` declares `constraints.requiresConsent` as an array of `DataClass` values, THE `Protocol_Package` SHALL validate that each entry is a recognized `DataClass`; IF any entry is unrecognized, THE `Protocol_Package` SHALL return a validation failure.
4. WHEN a `ManifestComponent` declares `constraints.requiresConsent` as an empty array, THE `Protocol_Package` SHALL accept it as valid.
5. WHEN a `ManifestComponent` declares `constraints.reversible` as a boolean, THE `Protocol_Package` SHALL accept `true` or `false`; IF `constraints.reversible` is a non-boolean value, THE `Protocol_Package` SHALL return a validation failure.
6. WHEN a valid `ManifestComponent` value `mc` is parsed through the `ManifestComponent` schema and the result is parsed a second time, THE second parse SHALL produce a value with identical field values to the first parse result (idempotent validation).
