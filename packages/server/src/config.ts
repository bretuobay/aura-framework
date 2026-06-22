/**
 * Configuration defaulting logic for @aura/server.
 *
 * Resolves user-provided partial configuration into a fully-defaulted
 * internal configuration used by route handlers and services.
 */

import type { AuraServerConfig, LatencyBudgetConfig } from "./types/config.types.js";
import type {
  ISessionStore,
  IContextStore,
  IUserModelStore,
  IFeedbackStore,
  IExplanationStore,
  IPrescriptionStore,
} from "./storage/interfaces.js";
import { createInMemorySessionStore } from "./storage/memory/session-store.js";
import { createInMemoryContextStore } from "./storage/memory/context-store.js";
import { createInMemoryUserModelStore } from "./storage/memory/user-model-store.js";
import { createInMemoryFeedbackStore } from "./storage/memory/feedback-store.js";
import { createInMemoryExplanationStore } from "./storage/memory/explanation-store.js";
import { createInMemoryPrescriptionStore } from "./storage/memory/prescription-store.js";

/**
 * Default latency budgets per the AUIP specification.
 */
export const DEFAULT_LATENCY_BUDGETS: LatencyBudgetConfig = {
  immediateMs: 50,
  fastMs: 200,
  deliberateMs: 2000,
};

/**
 * Default pipeline timeout in milliseconds.
 */
export const DEFAULT_PIPELINE_TIMEOUT_MS = 2000;

/**
 * Default replay detection window in milliseconds.
 */
export const DEFAULT_REPLAY_WINDOW_MS = 5000;

/**
 * Fully-resolved internal configuration with all defaults applied.
 */
export interface ResolvedConfig {
  pipeline: AuraServerConfig["pipeline"];
  sessionStore: ISessionStore;
  contextStore: IContextStore;
  userModelStore: IUserModelStore;
  feedbackStore: IFeedbackStore;
  explanationStore: IExplanationStore;
  prescriptionStore: IPrescriptionStore;
  pipelineTimeoutMs: number;
  latencyBudgets: LatencyBudgetConfig;
  replayWindowMs: number;
  securityPolicy: AuraServerConfig["securityPolicy"];
}

/**
 * Resolves user-provided configuration into a fully-defaulted ResolvedConfig.
 * Applies in-memory storage adapters and default budgets where not specified.
 */
export function resolveConfig(config: AuraServerConfig): ResolvedConfig {
  return {
    pipeline: config.pipeline,
    sessionStore: config.sessionStore ?? createInMemorySessionStore(),
    contextStore: config.contextStore ?? createInMemoryContextStore(),
    userModelStore: config.userModelStore ?? createInMemoryUserModelStore(),
    feedbackStore: config.feedbackStore ?? createInMemoryFeedbackStore(),
    explanationStore: config.explanationStore ?? createInMemoryExplanationStore(),
    prescriptionStore: config.prescriptionStore ?? createInMemoryPrescriptionStore(),
    pipelineTimeoutMs: config.pipelineTimeoutMs ?? DEFAULT_PIPELINE_TIMEOUT_MS,
    latencyBudgets: config.latencyBudgets ?? DEFAULT_LATENCY_BUDGETS,
    replayWindowMs: config.replayWindowMs ?? DEFAULT_REPLAY_WINDOW_MS,
    securityPolicy: config.securityPolicy,
  };
}
