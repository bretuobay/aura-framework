/**
 * Prescription application state types for the AURA E-Commerce Demo.
 * Manages active prescriptions, undo history, and application status.
 *
 * @see Requirements 6.1
 */

import type { UIPrescription } from "@aura/protocol";

/**
 * Status of an applied prescription.
 *
 * - "active": currently applied to the UI
 * - "undone": reverted by user action
 * - "expired": no longer valid (past expiresAt)
 */
export type PrescriptionStatus = "active" | "undone" | "expired";

/**
 * Tracks an individual prescription that has been applied to the UI.
 */
export interface AppliedPrescription {
  /** The original prescription from the AURA middleware */
  prescription: UIPrescription;
  /** ISO 8601 timestamp of when the prescription was applied */
  appliedAt: string;
  /** Snapshot of UI state before this prescription, for undo/revert */
  previousState: unknown;
  /** Current status of this applied prescription */
  status: PrescriptionStatus;
}

/**
 * A history entry capturing a prescription lifecycle event for undo support.
 */
export interface PrescriptionHistoryEntry {
  /** The prescription ID */
  prescriptionId: string;
  /** The surface this prescription targeted */
  surfaceId: string;
  /** Action that was taken */
  action: "applied" | "undone" | "expired" | "rejected";
  /** ISO 8601 timestamp of the action */
  timestamp: string;
  /** Snapshot of UI state before the action, for undo chains */
  previousState: unknown;
}

/**
 * Top-level state for prescription management.
 * Tracks all active prescriptions and maintains history for undo.
 */
export interface PrescriptionState {
  /** Map of prescription ID → applied prescription details */
  activePrescriptions: Map<string, AppliedPrescription>;
  /** Ordered history of prescription actions for undo support */
  history: PrescriptionHistoryEntry[];
}
