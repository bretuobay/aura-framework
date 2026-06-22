/**
 * Core TypeScript types and interfaces for @aura/rules.
 *
 * Re-exports shared types from @aura/protocol where they already exist,
 * and defines rules-specific types that are unique to this package.
 */

// ─── Re-exports from @aura/protocol ───────────────────────────────────────────

export type {
  RiskClass,
  PrescriptionMode,
  LatencyClass,
  AdaptationType,
  DataClass,
} from "@aura/protocol";

export type {
  AuraEvent,
  Adaptation,
  CapabilityManifest,
  ConsentProfile,
  ExplanationRecord,
  UIPrescription,
  ContextLock,
} from "@aura/protocol";

// ─── Rules-Specific Types ─────────────────────────────────────────────────────

/** A non-empty string uniquely identifying a Rule within a RuleSet. */
export type RuleId = string;

/** Dot-separated path into RulesPipelineInput (e.g. "event.type", "context.device"). */
export type ConditionPath = string;

/** Comparison operators supported by the condition evaluator. */
export type ConditionOperator =
  | "eq"
  | "neq"
  | "in"
  | "notIn"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "exists"
  | "matches";

/** Machine-readable audit value identifying the decision tier. */
export type DecisionSource = "rules" | "recommender" | "slm" | "llm";

// ─── Condition ────────────────────────────────────────────────────────────────

/** A typed predicate that tests a field of the evaluation input. */
export interface Condition {
  path: ConditionPath;
  operator: ConditionOperator;
  /** Optional when operator is 'exists'. */
  value?: unknown;
}

// ─── Action ───────────────────────────────────────────────────────────────────

import type { AdaptationType } from "@aura/protocol";

/** A typed action declaring the adaptation to include in a UIPrescription. */
export interface Action {
  adaptationType: AdaptationType;
  surfaceId: string;
  slotId: string;
  payload: Record<string, unknown>;
}

// ─── RuleMetadata ─────────────────────────────────────────────────────────────

import type { LatencyClass } from "@aura/protocol";

/** Optional metadata attached to a Rule for explanation and audit. */
export interface RuleMetadata {
  explanationSummary?: string;
  explanationFactors?: string[];
  userVisible?: boolean;
  /** Defaults to 'rules' when absent. */
  decisionSource?: DecisionSource;
  latencyClass?: LatencyClass;
  /** Required when decisionSource is 'llm'. */
  justification?: string;
}

// ─── Rule ─────────────────────────────────────────────────────────────────────

import type { RiskClass, DataClass } from "@aura/protocol";

/** The atomic unit of adaptation logic. */
export interface Rule {
  id: RuleId;
  /** Non-negative integer. Higher values indicate higher priority. */
  priority: number;
  riskClass: RiskClass;
  /** Non-empty array; conditions are combined with logical AND. */
  conditions: Condition[];
  /** Non-empty array; each action maps to one Adaptation entry. */
  actions: Action[];
  /** Optional consent requirements for consent gating. */
  requiredConsent?: DataClass[];
  metadata?: RuleMetadata;
}

// ─── RulesPipelineInput ───────────────────────────────────────────────────────

import type { AuraEvent, CapabilityManifest, ConsentProfile } from "@aura/protocol";

/** Combined evaluation context passed to the Evaluator on each call. */
export interface RulesPipelineInput {
  events: AuraEvent[];
  context: Record<string, unknown>;
  contextSequenceId: string;
  /** UserProfile — flexible record for now. */
  profile: Record<string, unknown>;
  manifest: CapabilityManifest;
  consent: ConsentProfile;
  sessionId: string;
  eventBatchId: string;
  feedback?: FeedbackContext;
}

// ─── FeedbackContext ──────────────────────────────────────────────────────────

/** Feedback signals used for reject/undo-aware suppression. */
export interface FeedbackContext {
  recentRejections: Array<{ ruleId: string; timestamp: string }>;
  recentUndos: Array<{ ruleId: string; timestamp: string }>;
}

// ─── CandidatePrescription ────────────────────────────────────────────────────

import type { PrescriptionMode, Adaptation, ExplanationRecord } from "@aura/protocol";

/** Intermediate prescription produced after a rule matches, before pipeline filtering. */
export interface CandidatePrescription {
  prescriptionId: string;
  ruleId: RuleId;
  surfaceId: string;
  mode: PrescriptionMode;
  latencyClass: LatencyClass;
  adaptations: Adaptation[];
  constraints: {
    expiresAt: string; // ISO timestamp
  };
  contextLock: {
    sequenceId: string;
    capturedAt: string; // ISO timestamp
  };
  manifestVersion: string;
  explanation?: ExplanationRecord;
  audit: {
    decisionSource: DecisionSource;
    dataClassesUsed: DataClass[];
  };
  riskClass: RiskClass;
  priority: number;
}

// ─── RuleSource ───────────────────────────────────────────────────────────────

/** Input to the rule loader. */
export type RuleSource = { type: "json"; data: unknown[] } | { type: "module"; rules: Rule[] };

// ─── RuleSet ──────────────────────────────────────────────────────────────────

/** An ordered, validated collection of Rules. */
export interface RuleSet {
  readonly rules: ReadonlyArray<Rule>;
  readonly size: number;
  getRule(id: RuleId): Rule | undefined;
  getRuleIds(): ReadonlyArray<RuleId>;
}

// ─── ClockProvider ────────────────────────────────────────────────────────────

/** Injectable time source for determinism. */
export interface ClockProvider {
  /** Returns an ISO 8601 timestamp string. */
  now(): string;
}

// ─── RulesLogger ──────────────────────────────────────────────────────────────

/** Structured log entry for rule evaluation events. */
export interface LogEntry {
  ruleId?: RuleId;
  phase?: "condition" | "construction" | "consent" | "manifest" | "protocol";
  reason?: string;
  error?: Error;
  details?: Record<string, unknown>;
}

/** Injectable logger for pipeline instrumentation. */
export interface RulesLogger {
  info(entry: LogEntry): void;
  warn(entry: LogEntry): void;
  error(entry: LogEntry): void;
}
