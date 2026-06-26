/**
 * PrescriptionEmitter — multi-gate validation and emission service.
 *
 * Orchestrates the validation pipeline before a candidate UIPrescription
 * is stored, explained, and broadcast via SSE. Gates are evaluated in strict
 * order: schema → capability → consent → context-lock → expiry → latency budget.
 *
 * On pass: stores prescription, stores explanation (if present), broadcasts via StreamRegistry.
 * On fail: returns structured EmitResult with RejectionReason.
 */

import { UIPrescriptionSchema } from "@aura/protocol";
import type { UIPrescription, ConsentProfile, ExplanationRecord } from "@aura/protocol";
import type { ICapabilityRegistry, CapabilityError } from "./capability-registry.js";
import type { IConsentEnforcer } from "./consent-enforcer.js";
import type { IStreamRegistry } from "./stream-registry.js";
import type { IPrescriptionStore, IExplanationStore } from "../storage/interfaces.js";
import type { SessionRecord } from "../types/internal.types.js";
import type { LatencyBudgetConfig } from "../types/config.types.js";
import type { IDevtoolsAccumulator } from "../devtools/accumulator.js";

// ─── Public Types ────────────────────────────────────────────────────────────

export interface IPrescriptionEmitter {
  /**
   * Validate and emit a candidate prescription.
   * Runs: schema validation → capability validation → consent check →
   *       context-lock check → expiry check → latency budget check.
   * On success: stores prescription, stores explanation (if present), broadcasts to SSE.
   * On failure: returns structured rejection result.
   */
  emit(
    candidate: UIPrescription,
    session: SessionRecord,
    config: EmissionContext,
  ): Promise<EmitResult>;
}

export interface EmissionContext {
  consentProfile: ConsentProfile;
  currentContextSequenceId: number;
  currentServerTime: string;
  latencyBudgets: LatencyBudgetConfig;
  evaluationStartTime: number; // performance.now() at pipeline invocation
}

export type EmitResult =
  | { emitted: true; prescriptionId: string }
  | { emitted: false; reason: RejectionReason; detail: string };

export type RejectionReason =
  | "schema-invalid"
  | "capability-invalid"
  | "consent-revoked"
  | "context-stale"
  | "expired"
  | "latency-exceeded"
  | "layout-stability-exceeded"
  | "manifest-version-mismatch";

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createPrescriptionEmitter(deps: {
  capabilityRegistry: ICapabilityRegistry;
  consentEnforcer: IConsentEnforcer;
  streamRegistry: IStreamRegistry;
  prescriptionStore: IPrescriptionStore;
  explanationStore: IExplanationStore;
  devtools?: IDevtoolsAccumulator;
}): IPrescriptionEmitter {
  const {
    capabilityRegistry,
    consentEnforcer,
    streamRegistry,
    prescriptionStore,
    explanationStore,
    devtools,
  } = deps;

  return {
    async emit(
      candidate: UIPrescription,
      session: SessionRecord,
      config: EmissionContext,
    ): Promise<EmitResult> {
      // ─── Gate 1: Schema Validation ───────────────────────────────────────────
      const schemaResult = UIPrescriptionSchema.safeParse(candidate);
      if (!schemaResult.success) {
        const detail = schemaResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        devtools?.recordPrescriptionResult(session.sessionId, candidate, "dropped", detail);
        return { emitted: false, reason: "schema-invalid", detail };
      }

      // ─── Gate 2: Capability Validation ───────────────────────────────────────
      const capResult = capabilityRegistry.validate(session.sessionId, candidate);
      if (!capResult.valid) {
        const hasManifestMismatch = capResult.errors.some(
          (err: CapabilityError) => err.type === "manifest-version-mismatch",
        );
        if (hasManifestMismatch) {
          const detail = capResult.errors
            .filter((err: CapabilityError) => err.type === "manifest-version-mismatch")
            .map((err: CapabilityError) => err.detail)
            .join("; ");
          devtools?.recordPrescriptionResult(session.sessionId, candidate, "rejected", detail);
          return { emitted: false, reason: "manifest-version-mismatch", detail };
        }
        const detail = capResult.errors
          .map((err: CapabilityError) => `[${err.type}] ${err.detail}`)
          .join("; ");
        devtools?.recordPrescriptionResult(session.sessionId, candidate, "rejected", detail);
        return { emitted: false, reason: "capability-invalid", detail };
      }

      // ─── Gate 3: Consent Check ───────────────────────────────────────────────
      const permitted = consentEnforcer.isPrescriptionPermitted(candidate, config.consentProfile);
      if (!permitted) {
        const detail = `Prescription "${candidate.id}" uses data classes revoked in the current consent profile`;
        devtools?.recordPrescriptionResult(session.sessionId, candidate, "dropped", detail);
        return { emitted: false, reason: "consent-revoked", detail };
      }

      // ─── Gate 4: Context-Lock Check ──────────────────────────────────────────
      if (candidate.contextLock.sequenceId !== config.currentContextSequenceId) {
        const detail = `Prescription contextLock.sequenceId (${candidate.contextLock.sequenceId}) does not match current context sequence (${config.currentContextSequenceId})`;
        devtools?.recordPrescriptionResult(session.sessionId, candidate, "dropped", detail);
        return { emitted: false, reason: "context-stale", detail };
      }

      // ─── Gate 5: Expiry Check ────────────────────────────────────────────────
      if (candidate.constraints.expiresAt <= config.currentServerTime) {
        const detail = `Prescription expiresAt "${candidate.constraints.expiresAt}" is at or before current server time "${config.currentServerTime}"`;
        devtools?.recordPrescriptionResult(session.sessionId, candidate, "dropped", detail);
        return { emitted: false, reason: "expired", detail };
      }

      // ─── Gate 6: Latency Budget Check ────────────────────────────────────────
      const elapsed = performance.now() - config.evaluationStartTime;
      const budget = getLatencyBudget(candidate.latencyClass, config.latencyBudgets);
      if (elapsed > budget) {
        const detail = `Elapsed ${elapsed.toFixed(1)}ms exceeds ${candidate.latencyClass} budget of ${budget}ms`;
        devtools?.recordPrescriptionResult(session.sessionId, candidate, "dropped", detail, elapsed);
        return { emitted: false, reason: "latency-exceeded", detail };
      }

      // ─── All Gates Passed: Store, Explain, Broadcast ─────────────────────────
      devtools?.recordPrescriptionResult(session.sessionId, candidate, "accepted", undefined, elapsed);
      await prescriptionStore.store(session.sessionId, candidate);

      if (candidate.explanation && candidate.explanation.summary) {
        const explanationRecord: ExplanationRecord = {
          id: candidate.id,
          summary: candidate.explanation.summary,
          userVisible: true,
          factors: [],
          confidence: candidate.explanation.confidence,
        };
        await explanationStore.store(candidate.id, explanationRecord);
      }

      streamRegistry.broadcast(session.sessionId, candidate);

      return { emitted: true, prescriptionId: candidate.id };
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLatencyBudget(latencyClass: string, budgets: LatencyBudgetConfig): number {
  switch (latencyClass) {
    case "immediate":
      return budgets.immediateMs;
    case "fast":
      return budgets.fastMs;
    case "deliberate":
      return budgets.deliberateMs;
    default:
      // Unknown latency class — use the most permissive budget
      return budgets.deliberateMs;
  }
}
