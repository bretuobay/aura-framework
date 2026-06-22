/**
 * @aura/server - Server-side AUIP v0 route handlers for the AURA framework.
 *
 * Provides Hono middleware and reference route handlers that manage session state,
 * enforce consent, validate prescriptions against capability manifests, integrate
 * with the @aura/rules evaluation pipeline, and deliver validated prescriptions
 * over SSE streams.
 */

// Main registration function
export { registerAuipRoutes } from "./register.js";

// Storage interfaces
export type {
  ISessionStore,
  IContextStore,
  IUserModelStore,
  IFeedbackStore,
  IExplanationStore,
  IPrescriptionStore,
} from "./storage/interfaces.js";

// In-memory storage factory functions
export { createInMemorySessionStore } from "./storage/memory/session-store.js";
export { createInMemoryContextStore } from "./storage/memory/context-store.js";
export { createInMemoryUserModelStore } from "./storage/memory/user-model-store.js";
export { createInMemoryFeedbackStore } from "./storage/memory/feedback-store.js";
export { createInMemoryExplanationStore } from "./storage/memory/explanation-store.js";
export { createInMemoryPrescriptionStore } from "./storage/memory/prescription-store.js";

// Configuration types
export type {
  AuraServerConfig,
  LatencyBudgetConfig,
  SecurityPolicyConfig,
  IRulesPipeline,
} from "./types/config.types.js";

// Internal types (re-exported for consumer convenience)
export type { SessionRecord, RulesPipelineInput } from "./types/internal.types.js";

// Service interfaces (for advanced use cases)
export type {
  ICapabilityRegistry,
  CapabilityValidationResult,
  CapabilityError,
} from "./services/capability-registry.js";
export type { IConsentEnforcer } from "./services/consent-enforcer.js";
export type { IStreamRegistry, SSEConnection } from "./services/stream-registry.js";
export type {
  IPrescriptionEmitter,
  EmissionContext,
  EmitResult,
  RejectionReason,
} from "./services/prescription-emitter.js";
export type {
  ISecurityAuditor,
  SecurityScanResult,
  SecurityAuditRecord,
} from "./services/security-auditor.js";
