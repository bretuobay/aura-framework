/**
 * Candidate Prescription Construction for the @aura/rules pipeline.
 *
 * Converts a matching Rule + RulesPipelineInput into a CandidatePrescription
 * with stable IDs, risk-class defaults, adaptation conversion, expiry, and audit.
 */

import { createHash } from "node:crypto";
import type {
  Rule,
  RulesPipelineInput,
  CandidatePrescription,
  ClockProvider,
  RiskClass,
  PrescriptionMode,
  LatencyClass,
  DecisionSource,
  DataClass,
  Adaptation,
  ExplanationRecord,
} from "../schema/types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default TTL for prescription expiry, in milliseconds. */
const DEFAULT_TTL_MS = 30_000;

// ─── Risk-Class Mappings ──────────────────────────────────────────────────────

const RISK_CLASS_MODE_MAP: Record<RiskClass, PrescriptionMode> = {
  low: "autoApply",
  medium: "recommend",
  high: "askUser",
  critical: "observeOnly",
};

const RISK_CLASS_LATENCY_MAP: Record<RiskClass, LatencyClass> = {
  low: "immediate",
  medium: "fast",
  high: "fast",
  critical: "fast",
};

// ─── Hash Utility ─────────────────────────────────────────────────────────────

/**
 * Generates a stable prescription ID by hashing the concatenation of
 * ruleId, sessionId, and eventBatchId using SHA-256 (first 16 hex chars).
 */
function generatePrescriptionId(
  ruleId: string,
  sessionId: string,
  eventBatchId: string
): string {
  const input = `${ruleId}${sessionId}${eventBatchId}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

// ─── Adaptation Conversion ────────────────────────────────────────────────────

/**
 * Converts a Rule Action into an Adaptation entry by spreading
 * the action payload over the base adaptationType field.
 */
function actionToAdaptation(action: Rule["actions"][number]): Adaptation {
  return { type: action.adaptationType, ...action.payload } as Adaptation;
}

// ─── Explanation Builder ──────────────────────────────────────────────────────

/**
 * Builds an ExplanationRecord from rule metadata when explanationSummary
 * is present.
 */
function buildExplanation(
  prescriptionId: string,
  metadata: Rule["metadata"]
): ExplanationRecord | undefined {
  if (!metadata?.explanationSummary) {
    return undefined;
  }

  return {
    id: `${prescriptionId}-explanation`,
    summary: metadata.explanationSummary,
    userVisible: metadata.userVisible ?? false,
    factors: metadata.explanationFactors ?? [],
    confidence: 1.0,
  };
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Constructs a CandidatePrescription from a matching Rule and pipeline input.
 *
 * Requirements validated:
 * - 4.1: Stable prescriptionId via hash(ruleId + sessionId + eventBatchId)
 * - 4.2: surfaceId from rule.actions[0].surfaceId
 * - 4.3: mode from risk-class default mapping
 * - 4.4: latencyClass from risk-class mapping with rule override support
 * - 4.5: Each Action converted to an Adaptation entry
 * - 4.6: constraints.expiresAt = clock.now() + 30s default TTL
 * - 4.7: ExplanationRecord from rule metadata when present
 * - 4.8: contextLock from input.contextSequenceId and clock.now()
 * - 4.9: adaptations.length === rule.actions.length (invariant)
 * - 4.10: manifestVersion from input.manifest.version or "unversioned"
 * - 4.11: audit.decisionSource from rule.metadata.decisionSource or "rules"
 * - 4.12: audit.dataClassesUsed from rule.requiredConsent or []
 */
export function buildCandidatePrescription(
  rule: Rule,
  input: RulesPipelineInput,
  clock: ClockProvider
): CandidatePrescription {
  const prescriptionId = generatePrescriptionId(
    rule.id,
    input.sessionId,
    input.eventBatchId
  );

  const now = clock.now();
  const expiresAt = new Date(new Date(now).getTime() + DEFAULT_TTL_MS).toISOString();

  const latencyClass: LatencyClass =
    rule.metadata?.latencyClass ?? RISK_CLASS_LATENCY_MAP[rule.riskClass];

  const adaptations: Adaptation[] = rule.actions.map(actionToAdaptation);

  const explanation = buildExplanation(prescriptionId, rule.metadata);

  const decisionSource: DecisionSource =
    rule.metadata?.decisionSource ?? "rules";

  const dataClassesUsed: DataClass[] = rule.requiredConsent ?? [];

  const candidate: CandidatePrescription = {
    prescriptionId,
    ruleId: rule.id,
    surfaceId: rule.actions[0].surfaceId,
    mode: RISK_CLASS_MODE_MAP[rule.riskClass],
    latencyClass,
    adaptations,
    constraints: {
      expiresAt,
    },
    contextLock: {
      sequenceId: input.contextSequenceId,
      capturedAt: now,
    },
    manifestVersion: input.manifest.version ?? "unversioned",
    audit: {
      decisionSource,
      dataClassesUsed,
    },
    riskClass: rule.riskClass,
    priority: rule.priority,
  };

  if (explanation) {
    candidate.explanation = explanation;
  }

  return candidate;
}
