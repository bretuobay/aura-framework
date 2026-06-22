/**
 * Internal types for @aura/server.
 *
 * Re-exports protocol types and defines server-specific types
 * (SessionRecord, RulesPipelineInput).
 */

// Re-export protocol types used throughout the server
export type {
  ContextModel,
  ProfileAttribute,
  FeedbackEvent,
  ExplanationRecord,
  UIPrescription,
  CapabilityManifest,
  ConsentProfile,
  AuraEvent,
} from "@aura/protocol";

import type {
  CapabilityManifest,
  ConsentProfile,
  ContextModel,
  ProfileAttribute,
  AuraEvent,
} from "@aura/protocol";

/**
 * Server-side session record tracking active AUIP sessions.
 * Created during POST /aura/session and updated throughout the session lifecycle.
 */
export interface SessionRecord {
  sessionId: string;
  userId: string;
  manifest: CapabilityManifest;
  manifestVersion: string; // extracted from manifest.version or "unversioned"
  consentProfile: ConsentProfile;
  contextSequenceId: number; // monotonically non-decreasing
  status: "active" | "terminated";
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Input structure passed to the rules pipeline for evaluation.
 * Assembled by the events route handler from session state and filtered inputs.
 */
export interface RulesPipelineInput {
  events: AuraEvent[];
  context: ContextModel;
  contextSequenceId: number;
  consentProfile: ConsentProfile;
  profileAttributes: ProfileAttribute[];
  manifest: CapabilityManifest;
}
