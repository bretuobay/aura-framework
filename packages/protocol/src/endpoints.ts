import { z } from "zod";
import { NonEmptyString, ContextSequenceId } from "./common.js";
import { CapabilityManifestSchema } from "./manifest.js";
import { AuraEventSchema } from "./event.js";
import { ContextModelSchema } from "./context.js";
import { ConsentProfileSchema } from "./consent.js";
import { UIPrescriptionSchema } from "./prescription.js";
import { FeedbackEventSchema } from "./feedback.js";
import { ExplanationRecordSchema } from "./explanation.js";
import { ProfileAttributeSchema, ProfileCorrectionSchema } from "./profile.js";

// ============================================================
// AUIP v0 Endpoint Request Schemas
// ============================================================

/**
 * POST /aura/session — Initialize a new AUIP session.
 * Validates sessionId, userId, manifest, consentProfile, context,
 * and an optional contextSequenceId.
 */
export const SessionRequestSchema = z.object({
  sessionId: NonEmptyString,
  userId: NonEmptyString,
  manifest: CapabilityManifestSchema,
  consentProfile: ConsentProfileSchema,
  context: ContextModelSchema,
  contextSequenceId: ContextSequenceId.optional(),
});

export type SessionRequest = z.infer<typeof SessionRequestSchema>;

/**
 * POST /aura/events — Submit interaction/behavioral events.
 * Validates sessionId, a non-empty array of AuraEvent objects,
 * and an optional contextSequenceId.
 */
export const EventsRequestSchema = z.object({
  sessionId: NonEmptyString,
  events: z.array(AuraEventSchema).nonempty(),
  contextSequenceId: ContextSequenceId.optional(),
});

export type EventsRequest = z.infer<typeof EventsRequestSchema>;

/**
 * POST /aura/context — Update session context.
 * Validates sessionId, a contextPatch (partial ContextModel),
 * and a required contextSequenceId.
 */
export const ContextRequestSchema = z.object({
  sessionId: NonEmptyString,
  contextPatch: ContextModelSchema.partial(),
  contextSequenceId: ContextSequenceId,
});

export type ContextRequest = z.infer<typeof ContextRequestSchema>;

/**
 * GET /aura/prescriptions/stream — Request prescriptions for a surface.
 * Validates sessionId and surfaceId.
 */
export const PrescriptionsStreamRequestSchema = z.object({
  sessionId: NonEmptyString,
  surfaceId: NonEmptyString,
});

export type PrescriptionsStreamRequest = z.infer<typeof PrescriptionsStreamRequestSchema>;

/**
 * POST /aura/feedback — Submit feedback on a prescription.
 * Validates sessionId and a feedback field conforming to FeedbackEvent.
 */
export const FeedbackRequestSchema = z.object({
  sessionId: NonEmptyString,
  feedback: FeedbackEventSchema,
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

/**
 * GET /aura/explain/:id — Request explanation for a prescription.
 * Validates sessionId and prescriptionId.
 */
export const ExplainRequestSchema = z.object({
  sessionId: NonEmptyString,
  prescriptionId: NonEmptyString,
});

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

/**
 * POST /aura/consent — Update consent profile.
 * Validates sessionId and a consentPatch conforming to ConsentProfile.
 */
export const ConsentRequestSchema = z.object({
  sessionId: NonEmptyString,
  consentPatch: ConsentProfileSchema,
});

export type ConsentRequest = z.infer<typeof ConsentRequestSchema>;

/**
 * GET /aura/profile — Retrieve user profile attributes.
 * Validates sessionId and an optional userId.
 */
export const ProfileRequestSchema = z.object({
  sessionId: NonEmptyString,
  userId: NonEmptyString.optional(),
});

export type ProfileRequest = z.infer<typeof ProfileRequestSchema>;

/**
 * POST /aura/profile/correction — Submit a profile correction.
 * Validates sessionId and a correction conforming to ProfileCorrection.
 */
export const ProfileCorrectionRequestSchema = z.object({
  sessionId: NonEmptyString,
  correction: ProfileCorrectionSchema,
});

export type ProfileCorrectionRequest = z.infer<typeof ProfileCorrectionRequestSchema>;

// ============================================================
// AUIP v0 Endpoint Response Schemas
// ============================================================

/**
 * Response for POST /aura/session.
 * Returns sessionId and status (active | rejected).
 */
export const SessionResponseSchema = z.object({
  sessionId: NonEmptyString,
  status: z.enum(["active", "rejected"]),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

/**
 * Response for POST /aura/events.
 * Returns status and count of accepted events.
 */
export const EventsResponseSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  count: z.number().int().nonnegative(),
});

export type EventsResponse = z.infer<typeof EventsResponseSchema>;

/**
 * Response for POST /aura/context.
 * Returns status and the new context sequence ID.
 */
export const ContextResponseSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  sequenceId: ContextSequenceId,
});

export type ContextResponse = z.infer<typeof ContextResponseSchema>;

/**
 * Response for GET /aura/prescriptions/stream.
 * Returns the array of prescriptions for the requested surface.
 */
export const PrescriptionsStreamResponseSchema = z.object({
  prescriptions: z.array(UIPrescriptionSchema),
});

export type PrescriptionsStreamResponse = z.infer<typeof PrescriptionsStreamResponseSchema>;

/**
 * Response for POST /aura/feedback.
 * Returns status indicating acceptance.
 */
export const FeedbackResponseSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

/**
 * Response for GET /aura/explain/:id.
 * Returns the explanation record for the requested prescription.
 */
export const ExplainResponseSchema = z.object({
  explanation: ExplanationRecordSchema,
});

export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;

/**
 * Response for POST /aura/consent.
 * Returns status and the effective (merged) consent profile.
 */
export const ConsentResponseSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  effectiveProfile: ConsentProfileSchema,
});

export type ConsentResponse = z.infer<typeof ConsentResponseSchema>;

/**
 * Response for GET /aura/profile.
 * Returns the list of profile attributes.
 */
export const ProfileResponseSchema = z.object({
  attributes: z.array(ProfileAttributeSchema),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;

/**
 * Response for POST /aura/profile/correction.
 * Returns status and an optional updated attribute.
 */
export const ProfileCorrectionResponseSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  updatedAttribute: ProfileAttributeSchema.optional(),
});

export type ProfileCorrectionResponse = z.infer<typeof ProfileCorrectionResponseSchema>;
