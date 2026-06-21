# Requirements Document

## Introduction

`@aura/rules` is the deterministic adaptation logic package for the AURA TypeScript framework. It provides a rules DSL, an evaluator, a fixture-based test runner, and a CLI for v0. It is the sole producer of candidate `UIPrescription` objects within the `@aura/server` pipeline, exposing an `IRulesPipeline` interface that the server calls whenever events or context changes arrive.

The package is responsible for: loading and validating rule definitions authored in JSON or TypeScript; matching each rule's conditions against the combined event, context, profile, manifest, and consent inputs for the current session; constructing well-formed candidate prescriptions from matching rules; filtering candidates through consent gates and manifest checks; enforcing risk-class policy on prescription modes; ordering surviving prescriptions by priority; and returning a `Promise<UIPrescription[]>` to the server pipeline. In the AURA reference architecture, v0 rules are the deterministic, low-latency tier; SLM and LLM routing is represented only through explicit metadata and server-side interfaces, not through hidden model calls in this package.

In addition to the runtime evaluator, `@aura/rules` must ship a fixture-based test runner that lets rule authors write input/expected-output pairs and verify rule logic without a running server. The package must also ship the v0 demo rules covering filter highlighting, product-card variant change, passive explanation generation, and reject/undo-aware suppression for the e-commerce search/results surface.

---

## Glossary

- **Rules_Package**: The `@aura/rules` npm package providing the DSL, evaluator, fixture runner, and CLI.
- **Rule**: A typed object declaring an `id`, `priority`, `riskClass`, one or more `conditions`, one or more `actions`, and optional `metadata`. A rule is the atomic unit of adaptation logic.
- **RuleDSL**: The TypeScript and JSON authoring format for `Rule` objects, defined by `RuleSchema`.
- **RuleId**: A non-empty string uniquely identifying a `Rule` within a rule set.
- **Priority**: A non-negative integer attached to a `Rule`. Higher values indicate higher priority. Rules with equal priority are ordered by `id` lexicographically.
- **RiskClass**: An enumerated governance tier (`low`, `medium`, `high`, `critical`) controlling the default `PrescriptionMode` and human-confirmation behavior. Imported from `@aura/protocol`.
- **Condition**: A typed predicate inside a `Rule` that tests a field of the evaluation input. Conditions within a rule are combined with logical AND by default. A rule matches when all its conditions evaluate to `true`.
- **ConditionOperator**: The comparison function applied in a `Condition`. v0 must support `eq`, `neq`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `exists`, and `matches` (regex string match).
- **ConditionPath**: A dot-separated string that navigates the `RulesPipelineInput` to the field being tested (e.g. `event.type`, `context.device`, `profile.intentKey`, `consent.behavior`).
- **Action**: A typed object inside a `Rule` that declares the `adaptationType` and the adaptation-specific payload to include in the resulting `UIPrescription`. Each action maps to one `Adaptation` entry in `@aura/protocol`.
- **RulesPipelineInput**: The combined evaluation context passed to the `Evaluator` on each call, containing `events`, `context`, `contextSequenceId`, `profile`, `manifest`, and `consent` fields.
- **Evaluator**: The core function inside `Rules_Package` that receives a `RulesPipelineInput`, evaluates all loaded rules, and returns a `Promise<UIPrescription[]>`.
- **IRulesPipeline**: The interface declared in `@aura/server` that `Rules_Package` must implement, exposing `evaluate(input: RulesPipelineInput): Promise<UIPrescription[]>`.
- **CandidatePrescription**: An intermediate prescription object produced after a rule matches, before consent gating, manifest checking, and risk-class enforcement.
- **ConsentGate**: The filter step that removes `CandidatePrescription` objects whose required data classes lack consent in the current `ConsentProfile`.
- **ManifestCheck**: The filter step that removes `CandidatePrescription` objects referencing surfaces, components, or variants not declared in the session `CapabilityManifest`.
- **RiskClassEnforcer**: The step that adjusts or rejects `CandidatePrescription` objects whose `mode` is incompatible with their `riskClass` per v0 risk policy.
- **Fixture**: A typed test case containing an `id`, a `RulesPipelineInput`, and an `expected` array of `UIPrescription` matchers used by the fixture runner to verify rule behavior.
- **FixtureRunner**: The programmatic and CLI component that loads fixture files, runs the `Evaluator` against each fixture input, and reports pass/fail with diff output.
- **RuleSet**: An ordered collection of `Rule` objects loaded into the `Evaluator`.
- **ExplanationMetadata**: Optional structured fields on a `Rule` that the `Evaluator` uses to populate the `ExplanationRecord` on emitted prescriptions.
- **PrescriptionMode**: An enumerated delivery mode (`recommend`, `autoApply`, `askUser`, `observeOnly`) imported from `@aura/protocol`.
- **UIPrescription**: The validated bounded recommendation object defined in `@aura/protocol` and returned by the `Evaluator`.
- **ContextLock**: The temporal validity guard attached to each `UIPrescription`, copied from `RulesPipelineInput.contextSequenceId` with the evaluator clock timestamp.
- **DecisionSource**: A machine-readable audit value identifying the decision tier that produced a prescription, such as `rules`, `recommender`, `slm`, or `llm`.
- **LatencyBudget**: The architectural time budget associated with a prescription `latencyClass`: `immediate`, `fast`, or `deliberate`.
- **ISO_Timestamp**: A string in ISO 8601 format representing a point in time.
- **DataClass**: A named category of user data governed by consent, as defined in `@aura/protocol`.
- **Demo_Rules**: The v0 rule set shipping inside `Rules_Package` that covers the e-commerce search/results demo surface.

---

## Requirements

### Requirement 1: Rule Definition Schema

**User Story:** As a rule author, I want to define adaptation rules in JSON or TypeScript using a typed schema, so that rules are validated at load time and authoring errors are caught before the evaluator runs.

#### Acceptance Criteria

1. THE `Rules_Package` SHALL export a `RuleSchema` Zod schema and a corresponding `Rule` TypeScript type with the following required fields: `id` (non-empty string), `priority` (non-negative integer), `riskClass` (one of `low`, `medium`, `high`, `critical`), `conditions` (non-empty array of `Condition` objects), and `actions` (non-empty array of `Action` objects).
2. THE `Rules_Package` SHALL export a `ConditionSchema` that validates a `Condition` object with required fields `path` (non-empty dot-separated string), `operator` (one of `eq`, `neq`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `exists`, `matches`), and `value` (any JSON-serializable value); the `value` field SHALL be optional when `operator` is `exists`.
3. THE `Rules_Package` SHALL export an `ActionSchema` that validates an `Action` object with required fields `adaptationType` (one of `rank`, `componentVariant`, `layout`, `content`, `accessibility`, `filter`), `surfaceId` (non-empty string), `slotId` (non-empty string), and `payload` (an object whose shape varies by `adaptationType`).
4. WHEN a `Rule` object passes all `RuleSchema` constraints, THE `Rules_Package` SHALL parse it successfully and return a typed `Rule` value.
5. WHEN a `Rule` object has an empty `conditions` array, THE `Rules_Package` SHALL return a validation failure identifying the `conditions` field.
6. WHEN a `Rule` object has an empty `actions` array, THE `Rules_Package` SHALL return a validation failure identifying the `actions` field.
7. WHEN a `Rule.riskClass` value is not one of `low`, `medium`, `high`, or `critical`, THE `Rules_Package` SHALL return a validation failure identifying the `riskClass` field.
8. WHEN a `Rule.priority` value is a negative number or is not an integer, THE `Rules_Package` SHALL return a validation failure identifying the `priority` field.
9. THE `Rules_Package` SHALL export an optional `metadata` field on `Rule` containing `explanationSummary` (string), `explanationFactors` (string array), `userVisible` (boolean), `decisionSource` (defaulting to `rules`), and optional `latencyClass`; WHEN `metadata` is absent, THE `Rules_Package` SHALL parse the rule successfully without requiring it.
10. WHEN a valid `Rule` value `r` is serialized via `JSON.stringify(r)` and parsed back through `RuleSchema`, THE parsed result SHALL have all fields with values deeply equal to `r` (round-trip serialization property).
11. FOR ALL valid `Rule` values `r`, parsing `r` through `RuleSchema` a second time SHALL produce a value deeply equal to the first parse result (idempotent validation property).

---

### Requirement 2: Rule Set Loading

**User Story:** As a developer configuring the rules engine, I want to load rule sets from JSON files or TypeScript modules at startup, so that rules are available to the evaluator without redeployment complexity in v0.

#### Acceptance Criteria

1. THE `Rules_Package` SHALL export a `loadRules(source: RuleSource): Promise<RuleSet>` function that accepts a `RuleSource` union of `{ type: 'json'; data: unknown[] }` and `{ type: 'module'; rules: Rule[] }`.
2. WHEN `loadRules` is called with a `json` source, THE `Rules_Package` SHALL validate each entry through `RuleSchema` and resolve with a `RuleSet` containing all valid rules.
3. WHEN `loadRules` is called with a `json` source containing one or more invalid entries, THE `Rules_Package` SHALL reject with an error identifying the index and validation failures for each invalid entry.
4. WHEN `loadRules` is called with a `module` source, THE `Rules_Package` SHALL accept the array directly if all entries are already typed `Rule` objects, applying no additional serialization step.
5. WHEN `loadRules` is called with an empty array source, THE `Rules_Package` SHALL resolve with an empty `RuleSet` without error.
6. WHEN two rules in the same `RuleSet` share the same `id`, THE `Rules_Package` SHALL reject with an error identifying the duplicate `id`.
7. WHEN a `RuleSet` is loaded successfully, THE `Rules_Package` SHALL make rule count and individual rule metadata accessible for inspection without re-parsing the source.

---

### Requirement 3: Condition Evaluation

**User Story:** As the rules evaluator, I want to evaluate each rule's conditions against the pipeline input, so that only rules whose conditions are satisfied contribute candidate prescriptions.

#### Acceptance Criteria

1. WHEN all conditions in a `Rule` evaluate to `true` against a `RulesPipelineInput`, THE `Evaluator` SHALL classify the rule as matching.
2. WHEN any condition in a `Rule` evaluates to `false` against a `RulesPipelineInput`, THE `Evaluator` SHALL classify the rule as non-matching and produce no candidate prescription for that rule.
3. WHEN a `Condition` with `operator: "eq"` is evaluated, THE `Evaluator` SHALL resolve the value at `condition.path` in the `RulesPipelineInput` using dot-notation traversal and return `true` if and only if the resolved value strictly equals `condition.value`.
4. WHEN a `Condition` with `operator: "in"` is evaluated and `condition.value` is an array, THE `Evaluator` SHALL return `true` if the resolved field value is included in the `condition.value` array.
5. WHEN a `Condition` with `operator: "exists"` is evaluated, THE `Evaluator` SHALL return `true` if the resolved field is not `undefined` and not `null`.
6. WHEN a `Condition` with `operator: "matches"` is evaluated, THE `Evaluator` SHALL return `true` if the resolved field is a string that matches the regex pattern in `condition.value`.
7. WHEN a `Condition.path` references a field that does not exist in the `RulesPipelineInput`, THE `Evaluator` SHALL treat the condition as `false` rather than throwing an exception, and SHALL NOT affect other rules being evaluated.
8. WHEN a `Condition.path` traverses the `events` array, THE `Evaluator` SHALL match the condition against any event in the array (existential match over the events collection).
9. FOR ALL `RulesPipelineInput` values `i` and `Rule` values `r` where all conditions evaluate to `true`, negating the value of any single condition field in `i` SHALL cause the rule to evaluate as non-matching (metamorphic property).
10. THE `Evaluator` SHALL evaluate conditions deterministically: calling `evaluate(input)` twice with the same `input` SHALL produce the same set of matching rules both times (determinism property).

---

### Requirement 4: Candidate Prescription Construction

**User Story:** As the rules evaluator, I want to construct a well-formed candidate prescription from each matching rule, so that the pipeline has typed objects ready for consent gating and manifest checking.

#### Acceptance Criteria

1. WHEN a rule matches, THE `Evaluator` SHALL construct a `CandidatePrescription` with a stable `prescriptionId` derived from the `ruleId`, the `sessionId`, and the current event batch identifier such that the same rule matching on the same event batch produces the same `prescriptionId`.
2. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `surfaceId` to the `surfaceId` declared in the rule's first action.
3. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `mode` to the default mode for the rule's `riskClass`: `autoApply` for `low`, `recommend` for `medium`, `askUser` for `high`, and `observeOnly` for `critical`.
4. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `latencyClass` to `immediate` for `low`-risk rules and `fast` for `medium`-risk rules unless the rule explicitly overrides it; deterministic rules SHALL NOT set `latencyClass` to `deliberate` unless the rule is marked as delegating to an external model tier through metadata.
5. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL convert each `Action` in the rule to one `Adaptation` entry using the `adaptationType` and `payload` fields of the action.
6. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `constraints.expiresAt` to the current time plus a default TTL of 30 seconds unless the rule specifies a different TTL.
7. WHEN a rule has `metadata.explanationSummary` set, THE `Evaluator` SHALL include an `ExplanationRecord` on the prescription with `summary` equal to `metadata.explanationSummary`, `factors` equal to `metadata.explanationFactors` (or `[]` if absent), and `userVisible` equal to `metadata.userVisible` (or `false` if absent).
8. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `contextLock.sequenceId` to `RulesPipelineInput.contextSequenceId` and `contextLock.capturedAt` to the evaluator clock timestamp used for the evaluation cycle.
9. FOR ALL matching rules, the `CandidatePrescription.adaptations` array SHALL be non-empty and SHALL contain exactly as many entries as there are `Action` objects in the matching rule (invariant on construction).
10. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `manifestVersion` to `RulesPipelineInput.manifest.version` when present, or `"unversioned"` when absent.
11. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `audit.decisionSource` to the rule metadata `decisionSource` when present, or `rules` otherwise.
12. WHEN constructing a `CandidatePrescription`, THE `Evaluator` SHALL set `audit.dataClassesUsed` from the rule's `requiredConsent` list or an empty array when the rule declares no required consent.

---

### Requirement 5: Consent Gating

**User Story:** As the privacy and compliance layer within the evaluator, I want to remove candidate prescriptions that require data classes the user has not consented to, so that AURA never emits adaptations based on unconsented data.

#### Acceptance Criteria

1. WHEN a `Rule` declares a `requiredConsent` field listing one or more `DataClass` keys, THE `Evaluator` SHALL remove the candidate prescription produced by that rule if any listed `DataClass` is absent or set to `false` in the current `ConsentProfile`.
2. WHEN a `Rule` declares no `requiredConsent` field, THE `Evaluator` SHALL not apply consent filtering to that rule's candidate prescription.
3. WHEN the `ConsentProfile` in the `RulesPipelineInput` is an empty object, THE `Evaluator` SHALL treat all `DataClass` keys as unconsented and SHALL remove all candidate prescriptions that require any `DataClass`.
4. WHEN consent for a required `DataClass` changes from `false` to `true` between two `evaluate` calls with otherwise identical inputs, THE candidate prescription for the previously blocked rule SHALL appear in the output of the second call (metamorphic consent property).
5. FOR ALL `RulesPipelineInput` values `i` where a rule's required `DataClass` is `false` in `i.consent`, the output of `evaluate(i)` SHALL contain no prescription produced by that rule (consent safety property).

---

### Requirement 6: Manifest Checking

**User Story:** As the manifest validation layer within the evaluator, I want to remove candidate prescriptions that reference surfaces, components, or variants not declared in the session manifest, so that AURA never prescribes changes outside the declared capability boundary.

#### Acceptance Criteria

1. WHEN a `CandidatePrescription.surfaceId` is not listed as a surface in the session `CapabilityManifest`, THE `Evaluator` SHALL discard the candidate prescription and log a manifest mismatch warning.
2. WHEN a `CandidatePrescription` contains a `componentVariant` adaptation whose `componentId` is not listed under the referenced surface in the `CapabilityManifest`, THE `Evaluator` SHALL discard the candidate prescription and log a manifest mismatch warning.
3. WHEN a `CandidatePrescription` contains a `componentVariant` adaptation whose `variant` is not listed among the declared variants for the referenced component, THE `Evaluator` SHALL discard the candidate prescription.
4. WHEN a `CandidatePrescription` references a `filter` adaptation and `filter.target` is not declared in the manifest, THE `Evaluator` SHALL discard the candidate prescription.
5. WHEN all surfaces, components, and variants referenced by a `CandidatePrescription` are declared in the manifest, THE `Evaluator` SHALL not discard the prescription on manifest grounds.
6. FOR ALL `RulesPipelineInput` values `i` where a candidate prescription's `surfaceId` is absent from `i.manifest`, the output of `evaluate(i)` SHALL contain no prescription for that surface (manifest boundary property).
7. WHEN the `surfaceId` is added to the manifest in an otherwise identical `RulesPipelineInput`, THE `Evaluator` SHALL include the candidate prescription in its output (metamorphic manifest property).

---

### Requirement 7: Risk-Class Enforcement

**User Story:** As the governance layer within the evaluator, I want to enforce risk-class policy on candidate prescriptions, so that high-risk and critical-risk adaptations are never auto-applied in v0.

#### Acceptance Criteria

1. WHEN a `CandidatePrescription` has `riskClass: "low"` and `mode: "autoApply"`, THE `Evaluator` SHALL include it in the output unchanged provided manifest and consent checks pass.
2. WHEN a `CandidatePrescription` has `riskClass: "medium"` and `mode: "autoApply"`, THE `Evaluator` SHALL downgrade `mode` to `recommend` unless the manifest entry for the referenced component explicitly declares `allowAutoApply: true`.
3. WHEN a `CandidatePrescription` has `riskClass: "high"`, THE `Evaluator` SHALL set `mode` to `askUser` regardless of the rule's declared mode.
4. WHEN a `CandidatePrescription` has `riskClass: "critical"`, THE `Evaluator` SHALL set `mode` to `observeOnly` regardless of the rule's declared mode.
5. FOR ALL output `UIPrescription` values `p` where `p.riskClass` is `critical`, `p.mode` SHALL equal `observeOnly` (critical-blocking safety property).
6. FOR ALL output `UIPrescription` values `p` where `p.riskClass` is `high`, `p.mode` SHALL be one of `askUser` or `observeOnly` (high-risk safety property).
7. WHEN a rule's `riskClass` is `low` and all other pipeline checks pass, THE `Evaluator` SHALL include a prescription in the output with `mode: "autoApply"` (low-risk pass-through property).

---

### Requirement 8: Priority Ordering

**User Story:** As the prescription consumer in `@aura/server`, I want prescriptions returned in priority order, so that the server emits the most important adaptation first when multiple rules match simultaneously.

#### Acceptance Criteria

1. WHEN multiple rules match and pass all pipeline checks, THE `Evaluator` SHALL return their prescriptions sorted by `priority` descending (highest priority first).
2. WHEN two matching rules have equal `priority` values, THE `Evaluator` SHALL order their prescriptions by `ruleId` lexicographically ascending as a stable tiebreaker.
3. WHEN only one rule matches, THE `Evaluator` SHALL return an array containing exactly one prescription.
4. WHEN no rules match, THE `Evaluator` SHALL return an empty array.
5. FOR ALL `RulesPipelineInput` values `i` and all pairs of matching rules `r1` and `r2` where `r1.priority > r2.priority`, the prescription for `r1` SHALL appear before the prescription for `r2` in the output of `evaluate(i)` (priority invariant).
6. WHEN a rule with a higher `priority` than all existing matching rules is added to the `RuleSet` and all conditions match, THE `Evaluator` SHALL place the new rule's prescription first in the output (monotone priority property).

---

### Requirement 9: Protocol Validation of Output Prescriptions

**User Story:** As the `@aura/server` pipeline, I want every prescription returned by `evaluate()` to be a valid `UIPrescription` as defined by `@aura/protocol`, so that invalid prescriptions never reach the SSE stream.

#### Acceptance Criteria

1. THE `Evaluator` SHALL validate each candidate prescription through `UIPrescriptionSchema` from `@aura/protocol` before including it in the return value.
2. WHEN a candidate prescription fails `UIPrescriptionSchema` validation, THE `Evaluator` SHALL discard it, log the validation errors, and continue processing remaining candidates without throwing.
3. WHEN `evaluate()` returns a non-empty array, every element SHALL pass `UIPrescriptionSchema.safeParse()` without error (output validity property).
4. THE `Rules_Package` SHALL implement the `IRulesPipeline` interface from `@aura/server`, exposing `evaluate(input: RulesPipelineInput): Promise<UIPrescription[]>`.
5. WHEN `evaluate()` is called and all candidate prescriptions fail protocol validation, THE `Evaluator` SHALL return an empty array rather than throwing.
6. FOR ALL valid `RulesPipelineInput` values `i`, the output of `evaluate(i)` SHALL be an array where every element is a structurally valid `UIPrescription` (universal output validity property).

---

### Requirement 10: Evaluator Error Isolation

**User Story:** As a server operator, I want individual rule errors to be isolated from each other, so that one malformed rule or runtime exception does not prevent other valid rules from being evaluated.

#### Acceptance Criteria

1. WHEN a rule's condition evaluation throws a runtime exception, THE `Evaluator` SHALL catch the exception, log it with the `ruleId`, skip that rule's candidate, and continue evaluating the remaining rules.
2. WHEN a rule's action construction throws a runtime exception, THE `Evaluator` SHALL catch the exception, log it with the `ruleId`, discard the candidate, and continue.
3. WHEN all rules throw runtime exceptions, THE `Evaluator` SHALL return an empty array and SHALL NOT re-throw any exception from `evaluate()`.
4. FOR ALL `RulesPipelineInput` values `i` containing at least one valid matching rule alongside one rule that throws during evaluation, the output of `evaluate(i)` SHALL contain the prescription from the valid rule (isolation property).
5. WHEN an error is caught during evaluation, THE `Evaluator` SHALL include the `ruleId` and error message in a structured log entry accessible to the `@aura/devtools` package.

---

### Requirement 11: Determinism

**User Story:** As a test author and server operator, I want the evaluator to be deterministic, so that the same input always produces the same output and fixture tests are reproducible.

#### Acceptance Criteria

1. WHEN `evaluate(input)` is called twice in sequence with the same `RulesPipelineInput` value and the same loaded `RuleSet`, THE two return values SHALL be deeply equal (determinism property).
2. THE `Evaluator` SHALL NOT depend on wall-clock time, random number generators, or external I/O to determine which rules match or what prescriptions are produced; timestamps used in prescription construction SHALL be computed from a clock provider that can be injected for testing.
3. WHEN the clock provider is fixed to a constant value in a test, THE `Evaluator` SHALL produce identically structured prescriptions including `constraints.expiresAt` across repeated calls (determinism under fixed clock).
4. THE `Evaluator` SHALL NOT mutate the `RulesPipelineInput` object passed to `evaluate()`; the input object SHALL be deeply equal before and after the call (input immutability invariant).

---

### Requirement 11a: Latency and Model-Routing Discipline

**User Story:** As an AURA architect, I want deterministic rules to remain the cheap and auditable decision tier, so that expensive SLM or LLM decisions are explicit, observable, and never hidden inside rules evaluation.

#### Acceptance Criteria

1. THE `Evaluator` SHALL NOT call network APIs, hosted LLM APIs, hosted SLM APIs, embedding services, or external recommender services during `evaluate()`.
2. WHEN a rule declares `metadata.decisionSource`, THE `Rules_Package` SHALL validate that it is one of `rules`, `recommender`, `slm`, or `llm`.
3. WHEN a rule declares `metadata.decisionSource` equal to `slm` or `llm`, THE `Evaluator` SHALL treat the rule as an externally prepared decision and SHALL NOT perform model inference itself.
4. WHEN a rule declares `metadata.decisionSource` equal to `llm`, THE rule SHALL also declare a non-empty `metadata.justification` explaining why rules, recommenders, or SLMs are insufficient for that decision.
5. WHEN `metadata.latencyClass` is `immediate`, THE rule SHALL be evaluable from local `RulesPipelineInput` fields only and SHALL NOT require asynchronous external I/O.
6. FOR ALL prescriptions produced directly by deterministic rules, `audit.decisionSource` SHALL equal `rules` unless the rule explicitly declares a different metadata value.
7. FOR ALL output prescriptions where `audit.decisionSource` equals `llm`, the prescription SHALL include an explanation summary and audit metadata sufficient for devtools to display why an expensive model tier was used.

---

### Requirement 12: Fixture-Based Rule Test Runner

**User Story:** As a rule author, I want to write fixture files describing evaluation inputs and expected prescription outputs, so that I can verify rule behavior in isolation without running a full server.

#### Acceptance Criteria

1. THE `Rules_Package` SHALL export a `FixtureRunner` class or function accepting a `RuleSet` and an array of `Fixture` objects, and returning a `FixtureRunResult` array describing pass or fail for each fixture.
2. THE `Rules_Package` SHALL export a `FixtureSchema` Zod schema validating a `Fixture` with required fields: `id` (non-empty string), `description` (non-empty string), `input` (a `RulesPipelineInput`), and `expected` (a `PrescriptionMatcher[]`).
3. THE `Rules_Package` SHALL export a `PrescriptionMatcher` type that supports at minimum: `surfaceId` (string match), `ruleId` (string match), `mode` (enum match), `adaptationType` (string match), and `count` (exact number of prescriptions expected).
4. WHEN a fixture's expected `count` is 0 and `evaluate(fixture.input)` returns an empty array, THE `FixtureRunner` SHALL mark the fixture as passed.
5. WHEN a fixture's expected `count` is greater than 0 and `evaluate(fixture.input)` returns fewer prescriptions than expected, THE `FixtureRunner` SHALL mark the fixture as failed and include a diff showing missing prescriptions.
6. WHEN a fixture matcher specifies `surfaceId` and the output prescriptions do not include any prescription with that `surfaceId`, THE `FixtureRunner` SHALL mark the fixture as failed.
7. WHEN `evaluate(fixture.input)` is called twice within the `FixtureRunner` with the same fixture input and same `RuleSet`, THE `FixtureRunner` SHALL produce the same pass/fail result both times (fixture determinism property).
8. WHEN a fixture file contains a `Fixture` with an invalid `input` that does not conform to `RulesPipelineInput` shape, THE `FixtureRunner` SHALL mark that fixture as an error (not a failure) and continue running remaining fixtures.
9. THE `FixtureRunner` SHALL return a `FixtureRunResult` array in the same order as the input fixtures, so that result indices correspond to fixture indices (order preservation invariant).

---

### Requirement 13: Fixture CLI

**User Story:** As a rule author, I want a CLI command that runs fixture files and reports results, so that I can integrate rule testing into a CI pipeline.

#### Acceptance Criteria

1. THE `Rules_Package` SHALL expose a `aura-rules test <fixtureGlob>` CLI command that resolves fixture files matching the glob pattern, loads a `RuleSet` from a co-located rules source, runs the `FixtureRunner`, and exits with code `0` if all fixtures pass or code `1` if any fixture fails or errors.
2. WHEN the CLI is run with `--verbose`, THE `Rules_Package` SHALL print each fixture `id`, `description`, and pass/fail status to stdout.
3. WHEN the CLI is run without `--verbose`, THE `Rules_Package` SHALL print only a summary line: total fixtures, passed count, failed count, and error count.
4. WHEN no fixture files match the provided glob, THE `Rules_Package` SHALL print a warning and exit with code `0`.
5. WHEN a fixture file cannot be parsed as valid JSON or a valid TypeScript module, THE `Rules_Package` CLI SHALL print an error identifying the file path and exit with code `1`.
6. THE `Rules_Package` SHALL expose the same behavior available through the CLI as a programmatic `runFixtures(options: RunFixturesOptions): Promise<FixtureSummary>` function so that test suites can embed the runner without spawning a subprocess.

---

### Requirement 14: Demo Rule — Filter Highlighting after Search Intent

**User Story:** As a demo user performing a product search, I want relevant filters to be highlighted when my search intent is detected, so that I can quickly narrow results without manual filter discovery.

#### Acceptance Criteria

1. WHEN an `AuraEvent` with `type: "search.submitted"` is present in the `RulesPipelineInput.events` array and the `ConsentProfile` includes `behavior: true`, THE `Demo_Rules` set SHALL produce a candidate prescription with at least one `filter` adaptation targeting the `search.results` surface.
2. WHEN the `filter` adaptation is included in the output prescription, THE `Adaptation.visibleFilters` array SHALL be non-empty and SHALL contain filter identifiers derived from the event payload's query field.
3. WHEN the `CapabilityManifest` does not declare the `search.results` surface, THE `Demo_Rules` evaluator SHALL discard the filter-highlighting prescription and return an empty array (manifest boundary enforcement).
4. THE filter-highlighting rule SHALL have `riskClass: "low"` and SHALL produce a prescription with `mode: "autoApply"` when manifest and consent checks pass.
5. WHEN `consent.behavior` is `false`, THE filter-highlighting rule SHALL be blocked by the `ConsentGate` and SHALL produce no prescription.

---

### Requirement 15: Demo Rule — Product-Card Variant Change for Comparison Intent

**User Story:** As a demo user comparing multiple products, I want product cards to switch to a comparison variant that surfaces key differentiating attributes, so that I can evaluate options side by side.

#### Acceptance Criteria

1. WHEN an `AuraEvent` with `type: "product.compareIntent"` is present in the `RulesPipelineInput.events` array and `consent.personalization` is `true`, THE `Demo_Rules` set SHALL produce a candidate prescription with a `componentVariant` adaptation targeting the `product-card` component on the `search.results` surface.
2. THE `componentVariant` adaptation SHALL set `variant` to `comparison` and `reasonCode` to a non-empty string describing the comparison intent trigger.
3. WHEN the `CapabilityManifest` declares the `product-card` component under `search.results` with `comparison` as a valid variant, THE prescription SHALL pass manifest checking and appear in the evaluator output.
4. THE product-card variant rule SHALL have `riskClass: "low"` and produce a prescription with `mode: "autoApply"`.
5. WHEN `consent.personalization` is `false`, THE product-card variant rule SHALL be blocked by the `ConsentGate` and SHALL produce no prescription.

---

### Requirement 16: Demo Rule — Passive Explanation Generation

**User Story:** As a demo user or developer, I want prescriptions to include a user-visible explanation derived from rule metadata, so that adaptive changes are transparent and auditable without requiring a separate explanation request.

#### Acceptance Criteria

1. WHEN a matching rule has `metadata.explanationSummary` set to a non-empty string, THE `Evaluator` SHALL attach an `ExplanationRecord` to the emitted prescription with `summary` equal to `metadata.explanationSummary`.
2. WHEN a matching rule has `metadata.explanationFactors` set to a non-empty string array, THE `ExplanationRecord.factors` array SHALL equal `metadata.explanationFactors`.
3. WHEN a matching rule has `metadata.userVisible: true`, THE `ExplanationRecord.userVisible` field SHALL be `true`.
4. THE `Demo_Rules` filter-highlighting rule and the product-card variant rule SHALL both declare non-empty `metadata.explanationSummary` values so that all demo prescriptions carry user-visible explanations.
5. FOR ALL rules in the `Demo_Rules` set that have `metadata.explanationSummary` set, every prescription they produce SHALL include an `ExplanationRecord` with a non-empty `summary` (explanation completeness property).
6. WHEN a rule has no `metadata` field, the emitted prescription SHALL omit the `explanation` field rather than including a null or empty record.

---

### Requirement 17: Demo Rule — Undo/Reject Feedback Handling

**User Story:** As a demo user who wants to reverse an adaptation, I want undo or reject feedback to influence later rule evaluation, so that the system respects my preference while feedback recording remains the server's responsibility.

#### Acceptance Criteria

1. WHEN `RulesPipelineInput` contains recent feedback context indicating a user rejected a prescription from a specific rule, THE `Evaluator` SHALL suppress a repeat prescription from that same rule for the current evaluation cycle.
2. WHEN `RulesPipelineInput` contains recent feedback context indicating a user undid a prescription from a specific rule, THE `Evaluator` SHALL treat that signal as reversible and SHALL NOT permanently suppress future prescriptions from that rule.
3. THE `Rules_Package` SHALL keep `evaluate(input)` compatible with `IRulesPipeline` by returning `Promise<UIPrescription[]>`; it SHALL NOT add feedback metadata to the return shape.
4. THE feedback handling behavior SHALL be covered by at least one fixture in the `Demo_Rules` fixture set where expected prescription count is zero after a reject signal.

---

### Requirement 18: Round-Trip and Structural Correctness Properties

**User Story:** As a quality engineer writing property-based tests for `@aura/rules`, I want documented correctness properties that I can encode as generative tests, so that the evaluator's invariants are machine-verified against arbitrary inputs.

#### Acceptance Criteria

1. FOR ALL valid `Rule` values `r`, `JSON.stringify(r)` followed by `RuleSchema.parse(JSON.parse(...))` SHALL produce a value deeply equal to `r` (rule round-trip property).
2. FOR ALL `RulesPipelineInput` values `i` and `RuleSet` values `rs`, calling `evaluate(i)` with `rs` twice SHALL return arrays that are deeply equal (evaluator determinism property).
3. FOR ALL `RulesPipelineInput` values `i`, the output of `evaluate(i)` SHALL be an array where every element passes `UIPrescriptionSchema.safeParse()` without error (output protocol-validity property).
4. FOR ALL `RulesPipelineInput` values `i` where `consent[dc]` is `false` for some `DataClass` `dc`, no prescription in the output of `evaluate(i)` SHALL have been produced by a rule whose `requiredConsent` includes `dc` (consent safety property).
5. FOR ALL `RulesPipelineInput` values `i` where some candidate prescription's `surfaceId` is not in `i.manifest.surfaces`, the output of `evaluate(i)` SHALL contain no prescription with that `surfaceId` (manifest boundary property).
6. FOR ALL output `UIPrescription` arrays returned by `evaluate(i)`, the `priority` values of the rules that produced consecutive prescriptions SHALL be non-increasing (priority ordering invariant).
7. FOR ALL output `UIPrescription` values `p` where the producing rule has `riskClass: "critical"`, `p.mode` SHALL equal `observeOnly` (critical-blocking safety invariant).
8. FOR ALL output `UIPrescription` values `p` where the producing rule has `riskClass: "high"`, `p.mode` SHALL be one of `askUser` or `observeOnly` (high-risk mode invariant).
9. FOR ALL `RulesPipelineInput` values `i`, the `evaluate()` call SHALL NOT mutate `i`; a deep-equal comparison of `i` before and after `evaluate(i)` SHALL find no differences (input immutability property).
10. FOR ALL `Fixture` values `f` in a `FixtureSet`, calling `runFixture(f)` twice with the same `RuleSet` SHALL return the same pass/fail result both times (fixture idempotence property).
