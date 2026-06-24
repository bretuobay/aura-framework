/**
 * Risk-class governance handler for AURA prescriptions.
 *
 * Determines governance behavior based on prescription risk classification:
 * - Low risk: auto-apply, show inline explanation, present undo button
 * - Medium risk: show dismissible overlay, apply after dismiss or 10s timeout
 * - High risk: show confirmation dialog, log audit entry, timeout at 30s without applying
 *
 * This module is framework-agnostic logic. React components consume the
 * governance instructions returned by these functions.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.7
 */

import type { RiskClass, GovernanceAuditEntry } from "@/lib/types/explanation";

/**
 * UI instruction type indicating what the consuming component should render.
 */
export type GovernanceUIType =
  | "inline-explanation"
  | "dismissible-overlay"
  | "confirmation-dialog";

/**
 * Governance instructions returned for a given prescription.
 * Tells the UI layer what to display and how to handle application timing.
 */
export interface GovernanceInstruction {
  /** The risk class of the prescription */
  riskClass: RiskClass;
  /** What type of UI to show */
  uiType: GovernanceUIType;
  /** Whether to auto-apply the adaptation immediately */
  autoApply: boolean;
  /** Whether to show an undo button */
  showUndo: boolean;
  /** Timeout in milliseconds before auto-action (null = no timeout) */
  timeoutMs: number | null;
  /** What happens on timeout: apply, dismiss, or null (no timeout behavior) */
  timeoutAction: "apply" | "dismiss" | null;
  /** Whether an audit entry should be logged for this decision */
  requiresAudit: boolean;
}

/**
 * Callback invoked when a governance decision is made (accept, reject, timeout).
 */
export type GovernanceDecisionCallback = (
  decision: GovernanceAuditEntry["decision"]
) => void;

/**
 * Active governance session for a single prescription.
 * Manages the timeout and decision lifecycle.
 */
export interface GovernanceSession {
  /** Unique session identifier (matches prescriptionId) */
  prescriptionId: string;
  /** The surface targeted by the prescription */
  surfaceId: string;
  /** Risk classification */
  riskClass: RiskClass;
  /** The governance instruction for this session */
  instruction: GovernanceInstruction;
  /** Cancel the active timeout (if any) */
  cancelTimeout: () => void;
  /** Record a user decision and finalize the session */
  resolve: (decision: GovernanceAuditEntry["decision"]) => void;
}

/** Timeout duration for medium-risk prescriptions (10 seconds) */
const MEDIUM_RISK_TIMEOUT_MS = 10_000;

/** Timeout duration for high-risk prescriptions (30 seconds) */
const HIGH_RISK_TIMEOUT_MS = 30_000;

/**
 * Returns governance instructions based on the prescription's risk class.
 *
 * @param riskClass - The risk classification of the prescription
 * @returns GovernanceInstruction describing what UI to show and when to apply
 */
export function getGovernanceInstruction(
  riskClass: RiskClass
): GovernanceInstruction {
  switch (riskClass) {
    case "low":
      return {
        riskClass: "low",
        uiType: "inline-explanation",
        autoApply: true,
        showUndo: true,
        timeoutMs: null,
        timeoutAction: null,
        requiresAudit: false,
      };

    case "medium":
      return {
        riskClass: "medium",
        uiType: "dismissible-overlay",
        autoApply: false,
        showUndo: true,
        timeoutMs: MEDIUM_RISK_TIMEOUT_MS,
        timeoutAction: "apply",
        requiresAudit: false,
      };

    case "high":
      return {
        riskClass: "high",
        uiType: "confirmation-dialog",
        autoApply: false,
        showUndo: true,
        timeoutMs: HIGH_RISK_TIMEOUT_MS,
        timeoutAction: "dismiss",
        requiresAudit: true,
      };
  }
}

/**
 * In-memory audit log for high-risk governance decisions.
 */
const auditLog: GovernanceAuditEntry[] = [];

/**
 * Creates an audit entry for a governance decision.
 *
 * @param prescriptionId - The prescription ID
 * @param surfaceId - The surface targeted by the prescription
 * @param riskClass - The risk classification
 * @param decision - The user's decision or timeout
 * @returns The created audit entry
 */
export function createAuditEntry(
  prescriptionId: string,
  surfaceId: string,
  riskClass: RiskClass,
  decision: GovernanceAuditEntry["decision"]
): GovernanceAuditEntry {
  const entry: GovernanceAuditEntry = {
    prescriptionId,
    surfaceId,
    riskClass,
    timestamp: new Date().toISOString(),
    decision,
  };

  auditLog.push(entry);
  return entry;
}

/**
 * Returns all recorded audit entries.
 */
export function getAuditLog(): ReadonlyArray<GovernanceAuditEntry> {
  return auditLog;
}

/**
 * Clears all recorded audit entries. Useful for testing and session resets.
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Creates a governance session for a prescription, managing timeout and decision lifecycle.
 *
 * For medium-risk prescriptions: starts a 10s timeout that auto-applies on expiry.
 * For high-risk prescriptions: starts a 30s timeout that dismisses without applying on expiry.
 * For low-risk prescriptions: no timeout (auto-applied immediately).
 *
 * @param prescriptionId - The prescription's unique identifier
 * @param surfaceId - The surface targeted by the prescription
 * @param riskClass - The risk classification
 * @param onDecision - Callback invoked when a decision is made (accept, reject, timeout)
 * @returns A GovernanceSession with controls to cancel timeout and resolve decisions
 */
export function createGovernanceSession(
  prescriptionId: string,
  surfaceId: string,
  riskClass: RiskClass,
  onDecision: GovernanceDecisionCallback
): GovernanceSession {
  const instruction = getGovernanceInstruction(riskClass);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolved = false;

  const resolve = (decision: GovernanceAuditEntry["decision"]): void => {
    if (resolved) return;
    resolved = true;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Log audit entry for high-risk decisions
    if (instruction.requiresAudit) {
      createAuditEntry(prescriptionId, surfaceId, riskClass, decision);
    }

    onDecision(decision);
  };

  const cancelTimeout = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // Start timeout for medium and high risk
  if (instruction.timeoutMs !== null) {
    timeoutId = setTimeout(() => {
      timeoutId = null;

      if (riskClass === "medium") {
        // Medium risk: auto-apply after 10s of inactivity
        resolve("accepted");
      } else if (riskClass === "high") {
        // High risk: dismiss without applying after 30s
        resolve("timeout");
      }
    }, instruction.timeoutMs);
  }

  return {
    prescriptionId,
    surfaceId,
    riskClass,
    instruction,
    cancelTimeout,
    resolve,
  };
}

/**
 * Determines whether a prescription should be applied based on the risk class
 * and decision outcome.
 *
 * @param riskClass - The risk classification
 * @param decision - The governance decision made
 * @returns true if the adaptation should be applied to the UI
 */
export function shouldApplyAdaptation(
  riskClass: RiskClass,
  decision: GovernanceAuditEntry["decision"]
): boolean {
  switch (riskClass) {
    case "low":
      // Low risk: always auto-applied
      return true;

    case "medium":
      // Medium risk: applied on accept (dismiss or timeout both count as accept)
      return decision === "accepted";

    case "high":
      // High risk: only applied on explicit accept
      return decision === "accepted";
  }
}
