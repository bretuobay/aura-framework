import { z } from "zod";
import {
  CapabilityManifestSchema,
  AuraEventSchema,
  ConsentProfileSchema,
  ProfileAttributeSchema,
  FeedbackEventSchema,
  ExplanationRecordSchema,
  ISOTimestamp,
  NonEmptyString,
  ContextSequenceId,
  DataClassSchema,
  RiskClassSchema,
  LatencyClassSchema,
  PrescriptionModeSchema,
} from "@aura/protocol";

// --- Devtools-specific sub-schemas ---

export const PrescriptionDispositionSchema = z.enum(["accepted", "rejected", "dropped"]);
export type PrescriptionDisposition = z.infer<typeof PrescriptionDispositionSchema>;

export const RuleConditionResultSchema = z.object({
  path: NonEmptyString,
  operator: NonEmptyString,
  expected: z.unknown(),
  passed: z.boolean(),
});
export type RuleConditionResult = z.infer<typeof RuleConditionResultSchema>;

export const RuleMatchRecordSchema = z.object({
  ruleId: NonEmptyString,
  prescriptionId: NonEmptyString,
  matched: z.boolean(),
  conditionResults: z.array(RuleConditionResultSchema),
  failureReason: z.string().optional(),
});
export type RuleMatchRecord = z.infer<typeof RuleMatchRecordSchema>;

export const ContextLockSnapshotSchema = z.object({
  sequenceId: ContextSequenceId,
  capturedAt: ISOTimestamp,
});
export type ContextLockSnapshot = z.infer<typeof ContextLockSnapshotSchema>;

export const PrescriptionAuditSchema = z.object({
  decisionSource: NonEmptyString,
  policyVersion: NonEmptyString,
  manifestVersion: NonEmptyString,
  dataClassesUsed: z.array(DataClassSchema),
  latencyClass: LatencyClassSchema,
  evaluationTimeMs: z.number().nonnegative().optional(),
  modelTier: z.string().optional(),
  llmJustification: z.string().optional(),
  cloudModelConsentGranted: z.boolean().optional(),
});
export type PrescriptionAudit = z.infer<typeof PrescriptionAuditSchema>;

export const AdaptationSummarySchema = z.object({
  type: NonEmptyString,
  target: z.string().optional(),
});
export type AdaptationSummary = z.infer<typeof AdaptationSummarySchema>;

export const PrescriptionEntrySchema = z.object({
  id: NonEmptyString,
  surfaceId: NonEmptyString,
  mode: PrescriptionModeSchema,
  riskClass: RiskClassSchema,
  manifestVersion: NonEmptyString,
  contextLock: ContextLockSnapshotSchema,
  disposition: PrescriptionDispositionSchema,
  dispositionTimestamp: ISOTimestamp,
  adaptations: z.array(AdaptationSummarySchema).min(1),
  rejectionReason: z.string().optional(),
  dropReason: z.string().optional(),
  currentContextSequenceId: ContextSequenceId.optional(),
  expiresAt: ISOTimestamp.optional(),
  replacedBy: z.string().optional(),
  layoutStabilityBudgetMs: z.number().nonnegative().optional(),
  elapsedMs: z.number().nonnegative().optional(),
});
export type PrescriptionEntry = z.infer<typeof PrescriptionEntrySchema>;

export const SecurityAuditRecordSchema = z.object({
  id: NonEmptyString,
  category: NonEmptyString,
  reason: NonEmptyString,
  timestamp: ISOTimestamp,
});
export type SecurityAuditRecord = z.infer<typeof SecurityAuditRecordSchema>;

export const OperationalAuditEntrySchema = z.object({
  prescriptionId: NonEmptyString.optional(),
  latencyClass: LatencyClassSchema.optional(),
  evaluationTimeMs: z.number().nonnegative().optional(),
  decisionSource: NonEmptyString.optional(),
  policyVersion: NonEmptyString.optional(),
  manifestVersion: NonEmptyString.optional(),
  dataClassesUsed: z.array(DataClassSchema).optional(),
  disposition: PrescriptionDispositionSchema.optional(),
  budgetMs: z.number().nonnegative().optional(),
  elapsedMs: z.number().nonnegative().optional(),
  dropReason: z.string().optional(),
  llmJustification: z.string().optional(),
  cloudModelConsentGranted: z.boolean().optional(),
});
export type OperationalAuditEntry = z.infer<typeof OperationalAuditEntrySchema>;

export const SessionMetadataSchema = z.object({
  sessionId: NonEmptyString,
  userId: NonEmptyString,
  status: z.enum(["active", "rejected"]),
  manifestVersion: z.string().optional(),
  contextSequenceId: ContextSequenceId,
  createdAt: ISOTimestamp,
});
export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

// --- Top-level DevtoolsState schema ---

export const DevtoolsStateSchema = z.object({
  session: SessionMetadataSchema,
  manifest: CapabilityManifestSchema,
  events: z.array(AuraEventSchema),
  prescriptions: z.array(PrescriptionEntrySchema),
  ruleMatches: z.array(RuleMatchRecordSchema),
  consentProfile: ConsentProfileSchema,
  profileAttributes: z.array(ProfileAttributeSchema),
  feedbackHistory: z.array(FeedbackEventSchema),
  operationalAudit: z.array(OperationalAuditEntrySchema),
  securityAudit: z.array(SecurityAuditRecordSchema),
});
export type DevtoolsState = z.infer<typeof DevtoolsStateSchema>;

// Re-export protocol schemas used by other devtools modules
export { ExplanationRecordSchema };
export type { ExplanationRecord } from "@aura/protocol";
