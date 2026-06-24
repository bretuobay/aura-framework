/**
 * Explanation and governance types for the AURA E-Commerce Demo.
 * Defines explanation content, contributing factors, risk classification,
 * and governance-related types.
 *
 * @see Requirements 4.2, 4.3
 */

/**
 * Risk classification for prescriptions, determining governance behavior.
 *
 * - "low": auto-applied with inline explanation and undo button
 * - "medium": dismissible overlay, applied after dismiss or 10s timeout
 * - "high": confirmation dialog required, 30s timeout without applying
 */
export type RiskClass = "low" | "medium" | "high";

/**
 * Category labels for contributing factors in explanations.
 */
export type FactorCategory =
  | "user behavior"
  | "device context"
  | "stated preference"
  | "browsing history"
  | "search intent"
  | "accessibility needs";

/**
 * A single contributing factor in an adaptation explanation.
 * Each factor identifies what influenced the adaptation decision.
 */
export interface ContributingFactor {
  /** Category of this factor */
  category: FactorCategory;
  /** Human-readable description of the factor's influence */
  description: string;
}

/**
 * A plain-language explanation of why an adaptation was applied.
 *
 * Constraints:
 * - text: total length ≤ 200 characters
 * - sentences: each sentence ≤ 30 words
 * - confidence: 0–100 (percentage)
 * - factors: at least 1 contributing factor with category label
 *
 * @see Requirements 10.2, 10.3, 10.4
 */
export interface Explanation {
  /** Plain-language explanation text, ≤200 characters total */
  text: string;
  /** Individual sentences of the explanation, each ≤30 words */
  sentences: string[];
  /** Confidence score as a percentage (0–100) */
  confidence: number;
  /** Contributing factors, at least 1 required */
  factors: ContributingFactor[];
}

/**
 * Governance audit entry recorded for high-risk prescription decisions.
 *
 * @see Requirements 9.3
 */
export interface GovernanceAuditEntry {
  /** The prescription ID */
  prescriptionId: string;
  /** The surface ID targeted by the prescription */
  surfaceId: string;
  /** Risk classification */
  riskClass: RiskClass;
  /** ISO 8601 timestamp of the decision */
  timestamp: string;
  /** The user's decision or timeout */
  decision: "accepted" | "rejected" | "timeout";
}

/**
 * Consent state for the user's privacy preferences.
 * Each category can be independently granted or revoked.
 *
 * @see Requirements 9.4
 */
export interface ConsentState {
  /** Whether behavior tracking is consented to */
  behavior: boolean;
  /** Whether personalization is consented to */
  personalization: boolean;
}

/**
 * Configuration for the explanation display.
 */
export interface ExplanationDisplayConfig {
  /** Whether explanations are enabled (from ENABLE_EXPLANATIONS flag) */
  enabled: boolean;
  /** Fallback message when explanation is unavailable */
  fallbackMessage: string;
}
