/**
 * Configuration types for @aura/server.
 *
 * Defines the server configuration interface, latency budgets,
 * security policy, and the rules pipeline contract.
 */

import type { RulesPipelineInput } from "./internal.types.js";
import type { UIPrescription } from "@aura/protocol";
import type {
  ISessionStore,
  IContextStore,
  IUserModelStore,
  IFeedbackStore,
  IExplanationStore,
  IPrescriptionStore,
} from "../storage/interfaces.js";

/**
 * Contract for the rules evaluation pipeline.
 * Accepts filtered session state and returns candidate prescriptions.
 */
export interface IRulesPipeline {
  evaluate(input: RulesPipelineInput): Promise<UIPrescription[]>;
}

/**
 * Latency budget configuration controlling how long the server
 * waits for pipeline results before rejecting prescriptions
 * that exceed their declared latencyClass budget.
 */
export interface LatencyBudgetConfig {
  immediateMs: number; // default: 50
  fastMs: number; // default: 200
  deliberateMs: number; // default: 2000
}

/**
 * Security policy configuration for adversarial resilience.
 */
export interface SecurityPolicyConfig {
  promptInjectionPatterns?: RegExp[];
  protectedAttributes?: string[];
  enableDevtools?: boolean;
}

/**
 * Top-level configuration for @aura/server route registration.
 * Passed to `registerAuipRoutes` to configure all AUIP v0 endpoints.
 */
export interface AuraServerConfig {
  /** Required: the rules evaluation pipeline */
  pipeline: IRulesPipeline;

  /** Optional storage adapters (defaults to in-memory) */
  sessionStore?: ISessionStore;
  contextStore?: IContextStore;
  userModelStore?: IUserModelStore;
  feedbackStore?: IFeedbackStore;
  explanationStore?: IExplanationStore;
  prescriptionStore?: IPrescriptionStore;

  /** Pipeline evaluation timeout in milliseconds (default: 2000) */
  pipelineTimeoutMs?: number;

  /** Latency budgets for prescription emission gating */
  latencyBudgets?: LatencyBudgetConfig;

  /** Replay detection window in milliseconds (default: 5000) */
  replayWindowMs?: number;

  /** Security policy for adversarial hardening */
  securityPolicy?: SecurityPolicyConfig;
}
