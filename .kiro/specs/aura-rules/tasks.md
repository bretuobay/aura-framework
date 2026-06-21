# Implementation Plan: @aura/rules

## Overview

Implement the `@aura/rules` package — the deterministic adaptation logic engine for the AURA TypeScript framework. The implementation follows the pipeline architecture: schema validation → rule loading → condition evaluation → candidate construction → consent gating → manifest checking → risk-class enforcement → protocol validation → priority sort. Each stage is a pure function with injectable dependencies for full testability.

## Tasks

- [ ] 1. Set up package structure and core configuration
  - [ ] 1.1 Initialize package with package.json, tsconfig.json, and vitest.config.ts
    - Create `@aura/rules` package directory with `package.json` (dependencies: zod, fast-glob, commander; devDependencies: vitest, fast-check, @fast-check/zod, @aura/protocol)
    - Create `tsconfig.json` with strict mode, ESM output, path aliases
    - Create `vitest.config.ts` with test file patterns for unit, property, and integration tests
    - Create `src/index.ts` as the public API barrel export
    - _Requirements: 1.1, 9.4_

  - [ ] 1.2 Define core TypeScript types and interfaces
    - Create `src/schema/types.ts` with all derived TypeScript types: `Rule`, `RuleId`, `RiskClass`, `Condition`, `ConditionPath`, `ConditionOperator`, `Action`, `AdaptationType`, `RuleMetadata`, `DecisionSource`, `LatencyClass`, `RulesPipelineInput`, `CandidatePrescription`, `PrescriptionMode`, `FeedbackContext`, `RuleSource`, `RuleSet`, `ClockProvider`, `RulesLogger`, `LogEntry`
    - Create `src/evaluator/clock.ts` with `ClockProvider` interface and `DefaultClockProvider` implementation using `new Date().toISOString()`
    - _Requirements: 1.1, 1.9, 11.2_


- [ ] 2. Implement Zod schemas for rules, conditions, and actions
  - [ ] 2.1 Create RuleSchema, ConditionSchema, and ActionSchema
    - Create `src/schema/rule.schema.ts` with Zod schemas: `ConditionSchema` (path: non-empty string, operator: enum of 10 operators, value: optional when operator is 'exists'), `ActionSchema` (adaptationType: enum of 6 types, surfaceId: non-empty string, slotId: non-empty string, payload: record), `RuleMetadataSchema` (explanationSummary, explanationFactors, userVisible, decisionSource defaulting to 'rules', latencyClass, justification required when decisionSource is 'llm'), `RuleSchema` (id: non-empty string, priority: non-negative integer, riskClass: enum, conditions: non-empty array, actions: non-empty array, requiredConsent: optional, metadata: optional)
    - Export all schemas and inferred types from `src/schema/rule.schema.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 11a.2, 11a.4_

  - [ ]* 2.2 Write property test for schema round-trip
    - **Property 1: Rule Schema Round-Trip**
    - Create `src/__tests__/properties/schema-roundtrip.property.test.ts`
    - Generate valid `Rule` values via `@fast-check/zod` from `RuleSchema`, serialize with `JSON.stringify`, parse back through `RuleSchema.parse(JSON.parse(...))`, assert deep equality
    - **Validates: Requirements 1.10, 1.11, 18.1**

  - [ ]* 2.3 Write unit tests for schema validation edge cases
    - Create `src/__tests__/unit/schema.test.ts`
    - Test: empty conditions array → validation failure; empty actions array → validation failure; invalid riskClass → failure; negative priority → failure; non-integer priority → failure; missing value when operator is not 'exists' → failure; valid rule with metadata → success; valid rule without metadata → success
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [ ] 3. Implement rule set loading
  - [ ] 3.1 Implement loadRules function
    - Create `src/loader/load-rules.ts` with `loadRules(source: RuleSource): Promise<RuleSet>` function
    - For `json` source: validate each entry through `RuleSchema`, reject with `RuleLoadError` identifying index and failures for invalid entries
    - For `module` source: accept typed `Rule[]` directly without re-serialization
    - Detect duplicate `id` values and reject with error identifying the duplicate
    - Return a `RuleSet` object with `rules`, `size`, `getRule(id)`, and `getRuleIds()` methods
    - Handle empty array input by resolving with empty `RuleSet`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.2 Write unit tests for rule loading
    - Create `src/__tests__/unit/loader.test.ts`
    - Test: valid JSON source loads successfully; invalid entry rejects with index; module source passes through; empty array returns empty RuleSet; duplicate id rejects; RuleSet methods work correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 4. Implement condition evaluation
  - [ ] 4.1 Implement dot-path resolution and condition evaluator
    - Create `src/evaluator/condition.ts` with `resolvePath(input: object, path: string): unknown` implementing dot-path traversal with existential matching over `events` array
    - Implement `evaluateCondition(condition: Condition, input: RulesPipelineInput): boolean` supporting all 10 operators: eq (strict equality), neq, in (array includes), notIn, gt, gte, lt, lte, exists (not undefined/null), matches (regex)
    - Implement `evaluateConditions(conditions: Condition[], input: RulesPipelineInput): boolean` returning true only when ALL conditions pass (logical AND)
    - Ensure missing paths return `undefined` without throwing; condition evaluates to `false` for missing paths (except `exists` which returns `false` naturally)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 4.2 Write property test for condition evaluation metamorphic property
    - **Property 3: Condition Evaluation Metamorphic**
    - Create `src/__tests__/properties/condition-metamorphic.property.test.ts`
    - Generate inputs where all conditions match, then negate a single field value and verify the rule no longer matches
    - **Validates: Requirements 3.1, 3.2, 3.9**

  - [ ]* 4.3 Write property test for condition operator correctness
    - **Property 4: Condition Operator Correctness**
    - Create `src/__tests__/properties/condition-operators.property.test.ts`
    - For each operator, generate condition + input pairs and verify the boolean result matches the operator's specification
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6**

  - [ ]* 4.4 Write property test for missing path safety
    - **Property 5: Missing Path Safety**
    - Create `src/__tests__/properties/missing-path-safety.property.test.ts` (can be combined in condition-operators file)
    - Generate conditions with non-existent paths and verify they evaluate to `false` without throwing
    - **Validates: Requirements 3.7, 3.8**

  - [ ]* 4.5 Write unit tests for condition evaluation
    - Create `src/__tests__/unit/condition.test.ts`
    - Test each operator with concrete examples, test existential matching over events array, test nested path traversal, test missing path returns false gracefully
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 5. Implement candidate prescription construction
  - [ ] 5.1 Implement buildCandidatePrescription function
    - Create `src/evaluator/construct.ts` with `buildCandidatePrescription(rule: Rule, input: RulesPipelineInput, clock: ClockProvider): CandidatePrescription`
    - Generate stable `prescriptionId` via hash of `ruleId + sessionId + eventBatchId`
    - Set `surfaceId` from `rule.actions[0].surfaceId`
    - Set `mode` from risk-class default mapping (low→autoApply, medium→recommend, high→askUser, critical→observeOnly)
    - Set `latencyClass` from risk-class mapping (low→immediate, medium→fast) with rule override support
    - Convert each `Action` to an `Adaptation` entry
    - Set `constraints.expiresAt` to `clock.now()` + 30s default TTL
    - Set `contextLock` from `input.contextSequenceId` and `clock.now()`
    - Set `manifestVersion` from `input.manifest.version` or `"unversioned"`
    - Set `audit.decisionSource` from `rule.metadata.decisionSource` or `"rules"`
    - Set `audit.dataClassesUsed` from `rule.requiredConsent` or `[]`
    - Build `ExplanationRecord` from rule metadata when present
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [ ]* 5.2 Write property test for candidate construction invariants
    - **Property 6: Candidate Construction Invariants**
    - Create `src/__tests__/properties/candidate-construction.property.test.ts`
    - Verify deterministic prescriptionId, correct surfaceId, correct mode for riskClass, adaptations.length equals actions.length, contextLock matches input, manifestVersion correct, audit fields correct
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.8, 4.9, 4.10, 4.11**

  - [ ]* 5.3 Write unit tests for candidate construction
    - Create `src/__tests__/unit/construct.test.ts`
    - Test: prescriptionId stability across calls; mode defaults for each riskClass; expiresAt calculation; explanation record presence/absence; manifestVersion fallback to "unversioned"
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 4.10_

- [ ] 6. Checkpoint - Core evaluation stages complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement consent gate
  - [ ] 7.1 Implement filterByConsent function
    - Create `src/evaluator/consent-gate.ts` with `filterByConsent(candidates: CandidatePrescription[], consent: ConsentProfile): CandidatePrescription[]`
    - Remove candidates whose rule's `requiredConsent` includes a DataClass that is `false` or absent in the consent profile
    - Pass through candidates with no `requiredConsent` field
    - Treat empty ConsentProfile as all DataClasses unconsented
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 7.2 Write property test for consent safety
    - **Property 7: Consent Safety**
    - Create `src/__tests__/properties/consent-safety.property.test.ts`
    - Generate inputs with specific consent states and rules requiring those DataClasses; verify blocked rules produce no output when consent is false/absent
    - **Validates: Requirements 5.1, 5.5, 18.4**

  - [ ]* 7.3 Write unit tests for consent gate
    - Create `src/__tests__/unit/consent-gate.test.ts`
    - Test: rule without requiredConsent passes; rule with consented DataClass passes; rule with unconsented DataClass blocked; empty consent blocks all requiring rules; consent change from false→true allows rule through
    - _Requirements: 5.1, 5.2, 5.3, 5.4_


- [ ] 8. Implement manifest checking
  - [ ] 8.1 Implement filterByManifest function
    - Create `src/evaluator/manifest-check.ts` with `filterByManifest(candidates: CandidatePrescription[], manifest: CapabilityManifest): CandidatePrescription[]`
    - Discard candidates whose `surfaceId` is not declared in `manifest.surfaces`
    - Discard candidates with `componentVariant` adaptation whose `componentId` is not under the referenced surface
    - Discard candidates with `componentVariant` adaptation whose `variant` is not declared for that component
    - Discard candidates with `filter` adaptation whose target is not declared in manifest
    - Keep candidates where all references are valid in the manifest
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.2 Write property test for manifest boundary
    - **Property 8: Manifest Boundary**
    - Create `src/__tests__/properties/manifest-boundary.property.test.ts`
    - Generate manifests with varying surface/component declarations and verify candidates referencing undeclared surfaces/components/variants are discarded; verify valid references pass
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 18.5**

  - [ ]* 8.3 Write unit tests for manifest checking
    - Create `src/__tests__/unit/manifest-check.test.ts`
    - Test: valid surface passes; missing surface discards; valid component passes; missing component discards; invalid variant discards; filter target validation; metamorphic test — adding surface allows through
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 9. Implement risk-class enforcement
  - [ ] 9.1 Implement enforceRiskClass function
    - Create `src/evaluator/risk-enforcer.ts` with `enforceRiskClass(candidates: CandidatePrescription[], manifest: CapabilityManifest): CandidatePrescription[]`
    - Low risk: allow `autoApply` and `recommend` unchanged
    - Medium risk: downgrade `autoApply` to `recommend` unless manifest declares `allowAutoApply: true` for the component
    - High risk: force `mode` to `askUser`
    - Critical risk: force `mode` to `observeOnly`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 9.2 Write property test for risk-class enforcement
    - **Property 9: Risk-Class Enforcement**
    - Create `src/__tests__/properties/risk-enforcement.property.test.ts`
    - Generate prescriptions with all risk classes and verify mode constraints: low→autoApply/recommend, medium→recommend (unless allowAutoApply), high→askUser/observeOnly, critical→observeOnly
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 18.7, 18.8**

  - [ ]* 9.3 Write unit tests for risk-class enforcement
    - Create `src/__tests__/unit/risk-enforcer.test.ts`
    - Test: low risk autoApply passes unchanged; medium risk autoApply downgrades to recommend; medium with allowAutoApply keeps autoApply; high forces askUser; critical forces observeOnly
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 10. Implement protocol validation and priority sort
  - [ ] 10.1 Implement validatePrescriptions function
    - Create `src/evaluator/protocol-validate.ts` with `validatePrescriptions(candidates: CandidatePrescription[]): UIPrescription[]`
    - Validate each candidate through `UIPrescriptionSchema.safeParse()` from `@aura/protocol`
    - Discard candidates that fail validation, log errors with ruleId and validation issues
    - Return only valid prescriptions; never throw
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ] 10.2 Implement sortByPriority function
    - Create `src/evaluator/priority-sort.ts` with `sortByPriority(prescriptions: UIPrescription[]): UIPrescription[]`
    - Sort by `priority` descending (highest first)
    - Use `ruleId` lexicographic ascending as stable tiebreaker for equal priorities
    - _Requirements: 8.1, 8.2_

  - [ ]* 10.3 Write property test for priority ordering invariant
    - **Property 10: Priority Ordering Invariant**
    - Create `src/__tests__/properties/priority-ordering.property.test.ts`
    - Generate multiple matching rules with varying priorities and verify output has non-increasing priority; verify lexicographic tiebreaker on equal priorities
    - **Validates: Requirements 8.1, 8.2, 8.5, 18.6**

  - [ ]* 10.4 Write property test for output protocol validity
    - **Property 11: Output Protocol Validity**
    - Create `src/__tests__/properties/output-validity.property.test.ts`
    - Generate arbitrary valid inputs and verify every element in evaluate() output passes UIPrescriptionSchema.safeParse()
    - **Validates: Requirements 9.3, 9.6, 18.3**

  - [ ]* 10.5 Write unit tests for protocol validation and priority sort
    - Create `src/__tests__/unit/protocol-validate.test.ts` and `src/__tests__/unit/priority-sort.test.ts`
    - Test: valid candidate passes validation; invalid candidate discarded; all invalid returns empty array; priority descending sort; tiebreaker on equal priority; single prescription returns as-is; empty input returns empty
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.5_

- [ ] 11. Checkpoint - Pipeline stages complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement the RulesPipeline orchestrator
  - [ ] 12.1 Implement RulesPipeline class with full evaluate() method
    - Create `src/evaluator/pipeline.ts` with `RulesPipeline` class implementing `IRulesPipeline`
    - Constructor accepts `{ ruleSet, clock?, logger? }` with defaults for clock and logger
    - Implement `evaluate(input: RulesPipelineInput): Promise<UIPrescription[]>` orchestrating the full pipeline:
      1. For each rule, wrap condition evaluation in try/catch (per-rule isolation); log and skip on error
      2. For matching rules, construct candidate prescriptions (with try/catch on construction)
      3. Apply feedback suppression: skip rules with recent rejections in `input.feedback.recentRejections`
      4. Filter through `filterByConsent(candidates, input.consent)`
      5. Filter through `filterByManifest(candidates, input.manifest)`
      6. Apply `enforceRiskClass(candidates, input.manifest)`
      7. Validate through `validatePrescriptions(candidates)`
      8. Sort via `sortByPriority(prescriptions)`
      9. Return validated `UIPrescription[]` (never throw)
    - Ensure input is never mutated (work on candidate copies)
    - _Requirements: 3.1, 3.2, 3.10, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.4, 10.1, 10.2, 10.3, 11.1, 11.2, 11.4, 11a.1, 17.1, 17.2, 17.3_

  - [ ]* 12.2 Write property test for evaluator determinism
    - **Property 2: Evaluator Determinism**
    - Create `src/__tests__/properties/determinism.property.test.ts`
    - Generate arbitrary inputs and rule sets with fixed clock; call evaluate() twice and assert deep equality of results
    - **Validates: Requirements 3.10, 11.1, 11.3, 18.2**

  - [ ]* 12.3 Write property test for error isolation
    - **Property 12: Error Isolation**
    - Create `src/__tests__/properties/error-isolation.property.test.ts`
    - Create rule sets with a mix of valid rules and rules with throwing conditions/constructors; verify valid rule prescriptions still appear in output
    - **Validates: Requirements 10.1, 10.2, 10.4**

  - [ ]* 12.4 Write property test for input immutability
    - **Property 13: Input Immutability**
    - Create `src/__tests__/properties/input-immutability.property.test.ts`
    - Deep-clone input before calling evaluate(), compare original to post-call input and assert deep equality
    - **Validates: Requirements 11.4, 18.9**

  - [ ]* 12.5 Write property test for feedback suppression
    - **Property 14: Feedback Suppression**
    - Create `src/__tests__/properties/feedback-suppression.property.test.ts`
    - Generate inputs with recent rejections for specific rules; verify those rules produce no prescriptions in the output
    - **Validates: Requirements 17.1**

  - [ ]* 12.6 Write unit tests for RulesPipeline orchestration
    - Create `src/__tests__/unit/pipeline.test.ts` (or extend existing)
    - Test: full pipeline happy path; error isolation with throwing rule; feedback suppression; empty rule set returns []; all rules filtered returns []; input not mutated after call
    - _Requirements: 9.4, 10.1, 10.2, 10.3, 10.5, 11.1, 11.4, 17.1, 17.2, 17.3_

- [ ] 13. Checkpoint - Pipeline orchestrator complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement fixture runner and schema
  - [ ] 14.1 Implement FixtureSchema and PrescriptionMatcher
    - Create `src/schema/fixture.schema.ts` with `FixtureSchema` (id: non-empty string, description: non-empty string, input: RulesPipelineInput shape, expected: PrescriptionMatcher[])
    - Define `PrescriptionMatcher` type supporting: surfaceId, ruleId, mode, adaptationType, count
    - _Requirements: 12.2, 12.3_

  - [ ] 14.2 Implement FixtureRunner and matcher logic
    - Create `src/fixture/matcher.ts` with prescription matching logic: match by surfaceId, ruleId, mode, adaptationType, and count
    - Create `src/fixture/diff.ts` with diff output generation for failed fixtures (show expected vs actual)
    - Create `src/fixture/runner.ts` with `FixtureRunner` class:
      - Accepts `RuleSet` and `Fixture[]`
      - Runs evaluate() for each fixture input
      - Matches output against expected PrescriptionMatcher[]
      - Reports pass/fail/error per fixture with diff on failure
      - Marks fixtures with invalid input as 'error' (not failure)
      - Returns results in same order as input fixtures
    - _Requirements: 12.1, 12.4, 12.5, 12.6, 12.8, 12.9_

  - [ ] 14.3 Implement programmatic runFixtures function
    - Create or extend `src/fixture/runner.ts` with `runFixtures(options: RunFixturesOptions): Promise<FixtureSummary>` function
    - Resolves fixture files via glob, loads rules source, runs FixtureRunner, returns summary with total/passed/failed/errors/results
    - _Requirements: 13.6_

  - [ ]* 14.4 Write property test for fixture determinism
    - **Property 15: Fixture Determinism**
    - Create `src/__tests__/properties/fixture-determinism.property.test.ts`
    - Run the same fixture twice with the same RuleSet and verify identical pass/fail results
    - **Validates: Requirements 12.7, 18.10**

- [ ] 15. Implement CLI
  - [ ] 15.1 Implement aura-rules CLI with test command
    - Create `src/cli/index.ts` as CLI entry point using `commander`
    - Create `src/cli/commands/test.ts` implementing `aura-rules test <fixtureGlob>` command:
      - Resolves fixture files via `fast-glob`
      - Loads co-located rules source
      - Runs FixtureRunner
      - With `--verbose`: prints each fixture id, description, and pass/fail status to stdout
      - Without `--verbose`: prints summary line (total, passed, failed, errors)
      - Exit code 0 if all pass; exit code 1 if any fail or error
      - Warning message and exit 0 when no fixtures match glob
      - Error message and exit 1 when fixture file cannot be parsed
    - Add `bin` entry in `package.json` pointing to CLI
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 15.2 Write integration tests for CLI
    - Create `src/__tests__/integration/cli.test.ts`
    - Test: CLI spawns and exits 0 with passing fixtures; exits 1 with failing fixture; verbose output includes fixture ids; no-match glob exits 0 with warning; invalid fixture file exits 1
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 16. Implement demo rules for e-commerce surface
  - [ ] 16.1 Create demo rules and fixtures
    - Create `src/demo/rules.ts` with `Demo_Rules` array containing:
      1. Filter highlighting rule: triggers on `search.submitted` event, requires `consent.behavior`, riskClass `low`, targets `search.results` surface with `filter` adaptation, includes explanationSummary
      2. Product-card variant rule: triggers on `product.compareIntent` event, requires `consent.personalization`, riskClass `low`, targets `product-card` component on `search.results` surface with `componentVariant` adaptation (variant: 'comparison'), includes explanationSummary
      3. Passive explanation rule: metadata with explanationSummary, explanationFactors, userVisible: true
      4. Reject/undo suppression fixture: uses feedback context
    - Create `src/demo/fixtures/` directory with fixture files:
      - `demo-filter-highlight.fixture.ts`: search event + consent → filter adaptation
      - `demo-product-card.fixture.ts`: compareIntent + consent → componentVariant
      - `demo-explanation.fixture.ts`: verify explanation records present
      - `demo-reject-suppress.fixture.ts`: feedback rejection → zero prescriptions
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 17.1, 17.4_

  - [ ]* 16.2 Write fixture tests for demo rules
    - Create `src/__tests__/fixtures/demo-filter-highlight.fixture.ts`, `demo-product-card.fixture.ts`, `demo-explanation.fixture.ts`, `demo-reject-suppress.fixture.ts`
    - Verify: filter highlighting produces filter adaptation with non-empty visibleFilters; product-card produces componentVariant with variant 'comparison'; explanation records present; reject feedback produces zero prescriptions; missing consent blocks; missing manifest surface blocks
    - _Requirements: 14.1, 14.5, 15.1, 15.5, 16.5, 17.4_

- [ ] 17. Wire public API exports and finalize package
  - [ ] 17.1 Complete src/index.ts public API barrel export
    - Export from `src/index.ts`: `RuleSchema`, `ConditionSchema`, `ActionSchema`, `FixtureSchema`, `RulesPipeline`, `loadRules`, `FixtureRunner`, `runFixtures`, all types (`Rule`, `Condition`, `Action`, `RuleSet`, `RuleSource`, `ClockProvider`, `Fixture`, `PrescriptionMatcher`, `FixtureRunResult`, `FixtureSummary`, `RunFixturesOptions`, `RulesLogger`, `LogEntry`)
    - Verify `RulesPipeline` implements `IRulesPipeline` from `@aura/protocol`
    - Ensure package.json `exports` field points to compiled output
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 9.4, 12.1, 12.2, 12.3, 13.6_

- [ ] 18. Final checkpoint - Full package verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (15 properties total)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations use TypeScript with strict mode
- Testing uses Vitest + fast-check as specified in the design
- The `@aura/protocol` package is assumed to exist and provide `UIPrescriptionSchema`, `IRulesPipeline`, and shared types

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "7.1", "8.1", "9.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.2", "8.3", "9.2", "9.3", "10.1", "10.2"] },
    { "id": 7, "tasks": ["10.3", "10.4", "10.5", "12.1"] },
    { "id": 8, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6"] },
    { "id": 9, "tasks": ["14.1"] },
    { "id": 10, "tasks": ["14.2", "14.3"] },
    { "id": 11, "tasks": ["14.4", "15.1", "16.1"] },
    { "id": 12, "tasks": ["15.2", "16.2"] },
    { "id": 13, "tasks": ["17.1"] }
  ]
}
```
