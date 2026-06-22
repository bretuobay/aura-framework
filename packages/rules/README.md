# @aura/rules

Deterministic policy engine for the AURA framework. Defines a rule DSL, evaluates conditions against user context and events, constructs bounded UI prescriptions, and provides a test fixture runner for verifying rule behavior.

## Overview

`@aura/rules` is the decision-making core of AURA. It:

- **Defines rules** via a JSON/YAML schema with conditions, actions, metadata, and risk classes
- **Evaluates conditions** against context models, events, and consent profiles
- **Constructs prescriptions** from matching rules with proper adaptation grouping
- **Enforces constraints** — consent gating, manifest compatibility, risk-class limits, protocol validation
- **Tests rules** via a fixture runner that asserts expected prescriptions for given inputs
- **Loads rules** from the filesystem with validation and error reporting

## Installation

```bash
pnpm add @aura/rules
```

## Quick Start

### Evaluate Rules

```typescript
import { RulesPipeline, loadRules } from '@aura/rules';

// Load rules from a directory
const rules = await loadRules('./rules/**/*.json');

// Create the pipeline
const pipeline = new RulesPipeline({ rules });

// Evaluate
const prescriptions = pipeline.evaluate({
  context: { device: 'mobile', locale: 'en-US', networkQuality: 'slow' },
  manifest: myCapabilityManifest,
  consentProfile: { behavior: true, personalization: true },
  events: recentEvents,
  surfaceId: 'search-results',
});
```

### Test Rules with Fixtures

```typescript
import { runFixtures } from '@aura/rules';

const summary = await runFixtures({
  rulesGlob: './rules/**/*.json',
  fixturesGlob: './fixtures/**/*.fixture.json',
});

console.log(`${summary.passed}/${summary.total} fixtures passed`);
```

### CLI

```bash
# Validate rules
aura-rules validate ./rules/

# Run fixtures
aura-rules test ./rules/ ./fixtures/

# Generate a diff report
aura-rules diff ./rules/ ./fixtures/ --output diff.json
```

## Rule Schema

```json
{
  "id": "slow-network-simplify",
  "priority": 80,
  "metadata": {
    "description": "Simplify layout on slow networks",
    "author": "platform-team",
    "version": "1.0.0"
  },
  "conditions": [
    { "path": "context.networkQuality", "operator": "eq", "value": "slow" },
    { "path": "consent.personalization", "operator": "eq", "value": true }
  ],
  "actions": [
    {
      "type": "layout",
      "surfaceId": "search-results",
      "layout": "compact",
      "reasonCode": "slow-network"
    }
  ],
  "riskClass": "low",
  "mode": "recommend",
  "latencyClass": "fast"
}
```

## Pipeline Stages

The evaluation pipeline runs in order:

1. **Condition evaluation** — match rules against current context/events
2. **Prescription construction** — build candidate prescriptions from matched rule actions
3. **Consent filtering** — remove prescriptions that require ungiven consent
4. **Manifest validation** — verify prescriptions target declared surfaces/components
5. **Risk enforcement** — enforce risk-class limits per the manifest
6. **Protocol validation** — ensure output conforms to `UIPrescriptionSchema`
7. **Priority sorting** — order by rule priority (highest first)

Each stage is independently exported for advanced usage:

```typescript
import {
  evaluateConditions,
  buildCandidatePrescription,
  filterByConsent,
  filterByManifest,
  enforceRiskClass,
  validatePrescriptions,
  sortByPriority,
} from '@aura/rules';
```

## Fixture Testing

Fixtures define expected inputs and outputs for rule evaluation:

```json
{
  "name": "slow network produces compact layout",
  "input": {
    "context": { "device": "mobile", "locale": "en-US", "networkQuality": "slow" },
    "manifest": { "surfaces": [...] },
    "consentProfile": { "behavior": true, "personalization": true },
    "events": [],
    "surfaceId": "search-results"
  },
  "expected": {
    "prescriptions": [
      { "surfaceId": "search-results", "adaptations": [{ "type": "layout", "layout": "compact" }] }
    ]
  }
}
```

## Key Exports

| Export | Description |
|--------|-------------|
| `RulesPipeline` | Main evaluation pipeline class |
| `loadRules(glob)` | Load and validate rules from filesystem |
| `FixtureRunner` | Run individual test fixtures |
| `runFixtures(options)` | Batch fixture execution with summary |
| `matchPrescriptions(actual, expected)` | Flexible prescription matching |
| `generateDiff(actual, expected)` | Structural diff for debugging |
| `RuleSchema` | Zod schema for rule validation |
| `FixtureSchema` | Zod schema for fixture validation |

## Condition Operators

| Operator | Description |
|----------|-------------|
| `eq` | Strict equality |
| `neq` | Not equal |
| `gt`, `gte`, `lt`, `lte` | Numeric comparisons |
| `in` | Value is in an array |
| `notIn` | Value is not in an array |
| `contains` | Array/string contains value |
| `matches` | Regex match |
| `exists` | Path exists (non-null/undefined) |

## Dependencies

- `@aura/protocol` — shared types and schemas
- `zod` — schema validation
- `commander` — CLI argument parsing
- `fast-glob` — rule/fixture file discovery

## Development

```bash
pnpm build       # Build with tsup
pnpm test        # Run Vitest + fast-check property tests
pnpm typecheck   # TypeScript strict mode check
```
