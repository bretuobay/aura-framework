/**
 * @aura/sdk — Type definitions
 *
 * Re-exports all protocol types from @aura/protocol and defines
 * internal SDK types used across the client implementation.
 */

// Re-export all protocol types
export * from "@aura/protocol";

// Import specific types needed for internal type definitions
import type {
  CapabilityManifest,
  ConsentProfile,
  ContextModel,
  AuraEvent,
  UIPrescription,
  FeedbackEvent,
  ExplanationRecord,
  ProfileAttribute,
  ProfileCorrection,
} from "@aura/protocol";

// Import from sibling module (will be created in task 1.3)
import type { AuraClientError } from "./errors.js";

// =============================================================================
// SDK Client Status
// =============================================================================

/** The three possible lifecycle states of an AuraClient instance. */
export type AuraClientStatus = "idle" | "active" | "degraded";

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration object accepted by `createAuraClient`.
 * All fields except `options` are required.
 */
export interface AuraClientConfig {
  /** Non-empty HTTPS URL (or HTTP for localhost) identifying the AUIP server. */
  endpoint: string;
  /** Host-authored capability manifest declaring surfaces, components, and variants. */
  manifest: CapabilityManifest;
  /** Non-empty user identifier string. */
  userId: string;
  /** Initial consent profile governing data-class permissions. */
  consentProfile: ConsentProfile;
  /** Initial context model snapshot. */
  context: ContextModel;
  /** Optional tuning parameters for queue, expiry, and timeouts. */
  options?: AuraClientOptions;
}

/**
 * Optional tuning parameters for the SDK.
 */
export interface AuraClientOptions {
  /** Maximum number of events the queue can hold. Default: 100 */
  queueCapacity?: number;
  /** Time-to-live for queued events in milliseconds. Default: 60000 (60s) */
  queueTTL?: number;
  /** Interval for prescription expiry checks in milliseconds. Default: 5000 (5s) */
  expiryCheckInterval?: number;
  /** HTTP request timeout in milliseconds. Default: 10000 (10s) */
  requestTimeout?: number;
}

// =============================================================================
// Session State
// =============================================================================

/**
 * Internal session state maintained by the AuraClient after initialization.
 */
export interface SessionState {
  /** Server-issued or SDK-generated session identifier. */
  sessionId: string;
  /** Manifest version pinned at init time; never changes for the client lifetime. */
  manifestVersion: string;
  /** Monotonically increasing context sequence counter. */
  contextSequenceId: number;
  /** Current in-memory consent profile, updated on each updateConsent call. */
  consentProfile: ConsentProfile;
  /** Current lifecycle status of the client. */
  status: AuraClientStatus;
}

// =============================================================================
// Observability Types
// =============================================================================

/**
 * A structured log entry stored in the SDK's circular log buffer.
 */
export interface AuraLogEntry {
  /** Severity level of the log entry. */
  level: "error" | "warn";
  /** ISO 8601 timestamp of when the entry was created. */
  timestamp: string;
  /** Machine-readable error code (e.g., "SSE_CONNECTION_LOST"). */
  code: string;
  /** Human-readable description of the event. */
  message: string;
  /** Optional structured context for debugging. */
  context?: Record<string, unknown>;
}

// =============================================================================
// Listener Types
// =============================================================================

/**
 * Callback invoked when a prescription changes for a subscribed surface.
 * Receives `undefined` when the prescription is removed or expired.
 */
export type PrescriptionListener = (prescription: UIPrescription | undefined) => void;

// =============================================================================
// ProfileSummary
// =============================================================================

/**
 * The user-visible adaptive profile returned by `getProfile()`.
 * Contains an array of profile attributes.
 */
export interface ProfileSummary {
  attributes: ProfileAttribute[];
}

// =============================================================================
// AuraClient Interface
// =============================================================================

/**
 * The public interface of the AURA SDK client.
 * All methods are non-blocking and never throw synchronous exceptions.
 */
export interface AuraClient {
  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  /** Current lifecycle status: "idle", "active", or "degraded". */
  readonly status: AuraClientStatus;

  /**
   * Initialize the AURA session. POSTs to /aura/session, opens the SSE stream,
   * and flushes any queued events. Transitions to "active" on success or
   * "degraded" on failure. Never rejects.
   */
  init(): Promise<void>;

  /**
   * Disconnect the client. Closes SSE, clears listeners and prescriptions,
   * transitions to "degraded". Synchronous, never throws.
   */
  disconnect(): void;

  // ─── Events ──────────────────────────────────────────────────────────────────

  /**
   * Emit a behavioral/interaction event to the AURA server.
   * Queues events when not active. Rejects only for validation errors.
   */
  emit(event: AuraEvent): Promise<void>;

  // ─── Context ─────────────────────────────────────────────────────────────────

  /**
   * Push an incremental context update to the server.
   * Increments contextSequenceId before sending.
   * Rejects only for validation errors.
   */
  updateContext(contextPatch: Partial<ContextModel>): Promise<void>;

  /** Returns the current context sequence ID. */
  getContextSequenceId(): number;

  // ─── Prescriptions ───────────────────────────────────────────────────────────

  /**
   * Subscribe to prescription changes for a named surface.
   * Returns an unsubscribe function.
   */
  subscribe(surfaceId: string, listener: PrescriptionListener): () => void;

  /** Returns the current prescription for a surface, or undefined if none. */
  getPrescription(surfaceId: string): UIPrescription | undefined;

  // ─── Feedback ────────────────────────────────────────────────────────────────

  /**
   * Submit feedback on a prescription (accept, dismiss, override, undo, reject).
   * Rejects only for validation errors.
   */
  feedback(feedbackEvent: FeedbackEvent): Promise<void>;

  // ─── Consent ─────────────────────────────────────────────────────────────────

  /**
   * Apply an incremental consent change. Updates local state immediately
   * regardless of network success. Rejects only for validation errors.
   */
  updateConsent(consentPatch: Partial<ConsentProfile>): Promise<void>;

  /** Returns the current in-memory consent profile. */
  getConsent(): ConsentProfile;

  // ─── Explanations ────────────────────────────────────────────────────────────

  /**
   * Retrieve the explanation record for a prescription.
   * Returns null if not found or client is degraded.
   */
  explain(prescriptionId: string): Promise<ExplanationRecord | null>;

  // ─── Profile ─────────────────────────────────────────────────────────────────

  /**
   * Retrieve the current adaptive profile summary.
   * Returns { attributes: [] } when degraded.
   */
  getProfile(): Promise<ProfileSummary>;

  /**
   * Submit a profile correction (remove or correct an attribute).
   * Rejects only for validation errors.
   */
  correctProfile(correction: ProfileCorrection): Promise<void>;

  // ─── Observability ───────────────────────────────────────────────────────────

  /**
   * Register an error handler for internal runtime errors.
   * Returns an unsubscribe function.
   */
  onError(handler: (error: AuraClientError) => void): () => void;

  /** Returns all entries from the circular log buffer in chronological order. */
  getLogs(): AuraLogEntry[];
}
