/**
 * @aura/sdk — AuraClient implementation
 *
 * State machine: idle → active (on init success), idle → degraded (on init failure)
 * All public methods are non-blocking and never throw synchronous exceptions.
 */

import {
  SessionRequestSchema,
  SessionResponseSchema,
  EventsRequestSchema,
  ContextRequestSchema,
  ContextModelSchema,
  AuraEventSchema,
  FeedbackEventSchema,
  FeedbackRequestSchema,
  ConsentProfileSchema,
  ConsentRequestSchema,
  ExplanationRecordSchema,
  ProfileResponseSchema,
  ProfileCorrectionRequestSchema,
  ProfileCorrectionSchema,
} from "@aura/protocol";
import type {
  ConsentProfile,
  ContextModel,
  AuraEvent,
  UIPrescription,
  FeedbackEvent,
  ExplanationRecord,
  ProfileCorrection,
} from "@aura/protocol";

import { validateConfig } from "./config.js";
import { AuraClientError, AuraValidationError, ErrorCodes } from "./errors.js";
import { EventQueue } from "./event-queue.js";
import { HttpTransport } from "./http-transport.js";
import { LogBuffer } from "./log-buffer.js";
import { PrescriptionStore } from "./prescription-store.js";
import { SSEManager } from "./sse-manager.js";
import type {
  AuraClient,
  AuraClientConfig,
  AuraClientStatus,
  AuraLogEntry,
  PrescriptionListener,
  ProfileSummary,
} from "./types.js";

/**
 * Creates an AuraClient instance.
 *
 * - Validates config synchronously (throws AuraConfigError on invalid config)
 * - Returns an AuraClient in "idle" status
 * - No network I/O at construction time
 */
export function createAuraClient(config: AuraClientConfig): AuraClient {
  validateConfig(config);
  return new AuraClientImpl(config);
}

/**
 * Internal implementation of AuraClient.
 */
class AuraClientImpl implements AuraClient {
  // ─── Internal State ──────────────────────────────────────────────────────────

  private _status: AuraClientStatus = "idle";
  private _disconnected: boolean = false;
  private sessionId: string = "";
  private manifestVersion: string;
  private contextSequenceId: number = 0;
  private consentProfile: ConsentProfile;
  private readonly config: AuraClientConfig;

  // ─── Internal Modules ────────────────────────────────────────────────────────

  private readonly transport: HttpTransport;
  private sseManager: SSEManager | null = null;
  private readonly eventQueue: EventQueue;
  private readonly prescriptionStore: PrescriptionStore;
  private readonly logBuffer: LogBuffer;
  private readonly errorHandlers: Set<(error: AuraClientError) => void> =
    new Set();
  private evictionInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: AuraClientConfig) {
    this.config = config;
    this.consentProfile = { ...config.consentProfile };
    this.manifestVersion = config.manifest.version ?? "unversioned";

    // Initialize transport
    this.transport = new HttpTransport(config.endpoint, {
      requestTimeout: config.options?.requestTimeout,
    });

    // Initialize event queue
    this.eventQueue = new EventQueue({
      maxCapacity: config.options?.queueCapacity ?? 100,
      queueTTL: config.options?.queueTTL ?? 60_000,
    });

    // Initialize prescription store
    this.prescriptionStore = new PrescriptionStore();

    // Initialize log buffer
    this.logBuffer = new LogBuffer(200);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  get status(): AuraClientStatus {
    return this._status;
  }

  async init(): Promise<void> {
    // Idempotent: no-op when active or degraded
    if (this._status === "active" || this._status === "degraded") {
      return;
    }

    // Initialize contextSequenceId from config.context.sequenceId or 0
    this.contextSequenceId = this.config.context.sequenceId ?? 0;

    // Pin manifestVersion
    this.manifestVersion = this.config.manifest.version ?? "unversioned";

    // Generate a sessionId for the request
    const generatedSessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const response = await this.transport.post(
        "/aura/session",
        {
          sessionId: generatedSessionId,
          userId: this.config.userId,
          manifest: this.config.manifest,
          consentProfile: this.config.consentProfile,
          context: this.config.context,
          contextSequenceId: this.contextSequenceId,
        },
        SessionRequestSchema,
        SessionResponseSchema,
        undefined,
      );

      if (response && response.sessionId) {
        // Success: store sessionId, transition to active
        this.sessionId = response.sessionId;
        this._status = "active";

        // Open SSE connection
        this.openSSE();

        // Start periodic eviction sweep
        this.startEvictionSweep();

        // Flush queued events
        this.flushQueue();
      } else {
        // No valid response — degrade
        this.transitionToDegraded(
          "Session initialization returned invalid response",
          ErrorCodes.SESSION_INIT_FAILED,
          { generatedSessionId },
        );
      }
    } catch (error: unknown) {
      // Any failure: transition to degraded, never reject
      const message =
        error instanceof Error ? error.message : "Unknown error during init";
      const code =
        message.includes("status") || message.includes("failed")
          ? ErrorCodes.SESSION_INIT_FAILED
          : ErrorCodes.SESSION_UNREACHABLE;

      this.transitionToDegraded(message, code, {
        generatedSessionId,
        originalError: message,
      });
    }
  }

  disconnect(): void {
    // Set disconnected flag to prevent new requests
    this._disconnected = true;

    // Close SSE
    if (this.sseManager) {
      this.sseManager.disconnect();
      this.sseManager = null;
    }

    // Cancel eviction timer
    if (this.evictionInterval !== null) {
      clearInterval(this.evictionInterval);
      this.evictionInterval = null;
    }

    // Clear prescription store and listeners
    this.prescriptionStore.clear();
    this.prescriptionStore.clearListeners();

    // Transition to degraded
    this._status = "degraded";
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  async emit(event: AuraEvent): Promise<void> {
    // Validate event against AuraEventSchema
    const parseResult = AuraEventSchema.safeParse(event);
    if (!parseResult.success) {
      throw new AuraValidationError(
        "Event validation failed",
        parseResult.error.issues,
      );
    }

    // After disconnect, do nothing (no network calls)
    if (this._disconnected) {
      return;
    }

    // When idle or degraded: enqueue event, resolve without network call
    if (this._status !== "active") {
      this.eventQueue.enqueue(event);
      return;
    }

    // When active: POST to /aura/events
    try {
      await this.transport.post(
        "/aura/events",
        {
          sessionId: this.sessionId,
          events: [event],
          contextSequenceId: this.contextSequenceId,
        },
        EventsRequestSchema,
        undefined,
        this.sessionId,
      );
    } catch (_error: unknown) {
      // On transient failure: re-enqueue event, resolve without throwing
      this.eventQueue.enqueue(event);
      const message =
        _error instanceof Error ? _error.message : "Failed to emit event";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {
          eventType: event.type,
          surfaceId: event.surfaceId,
        }),
      );
    }
  }

  // ─── Context ─────────────────────────────────────────────────────────────────

  async updateContext(contextPatch: Partial<ContextModel>): Promise<void> {
    // Validate patch against partial ContextModelSchema
    const parseResult = ContextModelSchema.partial().safeParse(contextPatch);
    if (!parseResult.success) {
      throw new AuraValidationError(
        "Context patch validation failed",
        parseResult.error.issues,
      );
    }

    // Increment contextSequenceId before sending (regardless of status)
    this.contextSequenceId += 1;

    // After disconnect, do nothing
    if (this._disconnected) {
      return;
    }

    // When idle or degraded: update in-memory context and sequenceId, resolve
    if (this._status !== "active") {
      return;
    }

    // When active: POST to /aura/context
    try {
      await this.transport.post(
        "/aura/context",
        {
          sessionId: this.sessionId,
          contextPatch: parseResult.data,
          contextSequenceId: this.contextSequenceId,
        },
        ContextRequestSchema,
        undefined,
        this.sessionId,
      );
    } catch (_error: unknown) {
      // On transient failure: log warning, resolve
      const message =
        _error instanceof Error
          ? _error.message
          : "Failed to update context";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {
          contextSequenceId: this.contextSequenceId,
        }),
      );
    }
  }

  getContextSequenceId(): number {
    return this.contextSequenceId;
  }

  // ─── Prescriptions ───────────────────────────────────────────────────────────

  subscribe(surfaceId: string, listener: PrescriptionListener): () => void {
    return this.prescriptionStore.subscribe(surfaceId, listener);
  }

  getPrescription(surfaceId: string): UIPrescription | undefined {
    return this.prescriptionStore.get(surfaceId, this.contextSequenceId);
  }

  // ─── Feedback ────────────────────────────────────────────────────────────────

  async feedback(feedbackEvent: FeedbackEvent): Promise<void> {
    // Validate against FeedbackEventSchema
    const parseResult = FeedbackEventSchema.safeParse(feedbackEvent);
    if (!parseResult.success) {
      throw new AuraValidationError(
        "Feedback event validation failed",
        parseResult.error.issues,
      );
    }

    // On undo/reject action: remove prescription and notify listeners
    if (
      feedbackEvent.action === "undo" ||
      feedbackEvent.action === "reject"
    ) {
      const surfaceId = this.prescriptionStore.removeByPrescriptionId(
        feedbackEvent.prescriptionId,
      );
      if (surfaceId) {
        this.prescriptionStore.notifyListeners(surfaceId, undefined);
      }
    }

    // After disconnect, do nothing
    if (this._disconnected) {
      return;
    }

    // When idle or degraded: resolve without network call
    if (this._status !== "active") {
      return;
    }

    // When active: POST to /aura/feedback
    try {
      await this.transport.post(
        "/aura/feedback",
        {
          sessionId: this.sessionId,
          feedback: feedbackEvent,
        },
        FeedbackRequestSchema,
        undefined,
        this.sessionId,
      );
    } catch (_error: unknown) {
      // On transient failure: log warning, resolve (no retry)
      const message =
        _error instanceof Error ? _error.message : "Failed to send feedback";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {
          prescriptionId: feedbackEvent.prescriptionId,
          action: feedbackEvent.action,
        }),
      );
    }
  }

  // ─── Consent ─────────────────────────────────────────────────────────────────

  async updateConsent(consentPatch: Partial<ConsentProfile>): Promise<void> {
    // Validate against ConsentProfileSchema (record schema is already partial-friendly)
    const parseResult = ConsentProfileSchema.safeParse(consentPatch);
    if (!parseResult.success) {
      throw new AuraValidationError(
        "Consent patch validation failed",
        parseResult.error.issues,
      );
    }

    // Update in-memory ConsentProfile immediately
    this.consentProfile = { ...this.consentProfile, ...consentPatch };

    // On revocation (any DataClass key set to false):
    // Remove affected prescriptions and notify listeners
    for (const [key, value] of Object.entries(consentPatch)) {
      if (value === false) {
        const affectedSurfaceIds =
          this.prescriptionStore.removeByDataClass(key);
        for (const surfaceId of affectedSurfaceIds) {
          this.prescriptionStore.notifyListeners(surfaceId, undefined);
        }
      }
    }

    // After disconnect, do nothing
    if (this._disconnected) {
      return;
    }

    // When idle or degraded: resolve without network call
    if (this._status !== "active") {
      return;
    }

    // When active: POST to /aura/consent
    try {
      await this.transport.post(
        "/aura/consent",
        {
          sessionId: this.sessionId,
          consentPatch: consentPatch as ConsentProfile,
        },
        ConsentRequestSchema,
        undefined,
        this.sessionId,
      );
    } catch (_error: unknown) {
      // On transient failure: log warning, resolve (local consent already updated)
      const message =
        _error instanceof Error
          ? _error.message
          : "Failed to update consent";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {
          patchKeys: Object.keys(consentPatch),
        }),
      );
    }
  }

  getConsent(): ConsentProfile {
    return { ...this.consentProfile };
  }

  // ─── Explanations ────────────────────────────────────────────────────────────

  async explain(prescriptionId: string): Promise<ExplanationRecord | null> {
    // Reject with AuraValidationError if prescriptionId is empty string
    if (!prescriptionId) {
      throw new AuraValidationError(
        "prescriptionId must be a non-empty string",
        [
          {
            code: "custom" as const,
            message: "prescriptionId must be a non-empty string",
            path: ["prescriptionId"],
          },
        ],
      );
    }

    // After disconnect, resolve with null
    if (this._disconnected) {
      return null;
    }

    // When degraded/idle: resolve with null
    if (this._status !== "active") {
      return null;
    }

    // When active: GET /aura/explain/{prescriptionId}
    try {
      const result = await this.transport.get(
        `/aura/explain/${prescriptionId}`,
        ExplanationRecordSchema,
        this.sessionId,
      );
      return result ?? null;
    } catch (_error: unknown) {
      // On error: resolve with null, log warning
      const message =
        _error instanceof Error
          ? _error.message
          : "Failed to get explanation";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {
          prescriptionId,
        }),
      );
      return null;
    }
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(): Promise<ProfileSummary> {
    // After disconnect, resolve with empty
    if (this._disconnected) {
      return { attributes: [] };
    }

    // When degraded/idle: resolve with { attributes: [] }
    if (this._status !== "active") {
      return { attributes: [] };
    }

    // When active: GET /aura/profile
    try {
      const result = await this.transport.get(
        "/aura/profile",
        ProfileResponseSchema,
        this.sessionId,
      );
      if (result) {
        return { attributes: result.attributes };
      }
      return { attributes: [] };
    } catch (_error: unknown) {
      // On error: resolve with { attributes: [] }, log warning
      const message =
        _error instanceof Error ? _error.message : "Failed to get profile";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {}),
      );
      return { attributes: [] };
    }
  }

  async correctProfile(correction: ProfileCorrection): Promise<void> {
    // Validate against ProfileCorrectionSchema
    const parseResult = ProfileCorrectionSchema.safeParse(correction);
    if (!parseResult.success) {
      throw new AuraValidationError(
        "Profile correction validation failed",
        parseResult.error.issues,
      );
    }

    // After disconnect, do nothing
    if (this._disconnected) {
      return;
    }

    // When degraded/idle: resolve without network call
    if (this._status !== "active") {
      return;
    }

    // When active: POST to /aura/profile/correction
    try {
      await this.transport.post(
        "/aura/profile/correction",
        {
          sessionId: this.sessionId,
          correction,
        },
        ProfileCorrectionRequestSchema,
        undefined,
        this.sessionId,
      );
    } catch (_error: unknown) {
      // On failure: log warning, resolve
      const message =
        _error instanceof Error
          ? _error.message
          : "Failed to correct profile";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {
          action: correction.action,
          attributeId: correction.attributeId,
        }),
      );
    }
  }

  // ─── Observability ───────────────────────────────────────────────────────────

  onError(handler: (error: AuraClientError) => void): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  getLogs(): AuraLogEntry[] {
    return this.logBuffer.getAll();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private transitionToDegraded(
    message: string,
    code: (typeof ErrorCodes)[keyof typeof ErrorCodes],
    context: Record<string, unknown>,
  ): void {
    this._status = "degraded";
    this.notifyError(new AuraClientError(message, code, context));
  }

  private notifyError(error: AuraClientError): void {
    if (this.errorHandlers.size > 0) {
      for (const handler of this.errorHandlers) {
        handler(error);
      }
    } else {
      console.warn(`[AuraSDK] ${error.code}: ${error.message}`);
    }
    this.logBuffer.log({
      level: "error",
      code: error.code,
      message: error.message,
      context: error.context,
    });
  }

  private openSSE(): void {
    this.sseManager = new SSEManager({
      endpoint: this.config.endpoint,
      sessionId: this.sessionId,
      onMessage: (prescription: UIPrescription) => {
        this.handlePrescription(prescription);
      },
      onError: (error: AuraClientError) => {
        this.notifyError(error);
      },
    });
    this.sseManager.connect();
  }

  private handlePrescription(prescription: UIPrescription): void {
    // Admission check 1: manifestVersion mismatch
    if (prescription.manifestVersion !== this.manifestVersion) {
      this.notifyError(
        new AuraClientError(
          `Prescription discarded: manifest version "${prescription.manifestVersion}" does not match pinned "${this.manifestVersion}"`,
          ErrorCodes.MANIFEST_VERSION_MISMATCH,
          {
            prescriptionId: prescription.id,
            surfaceId: prescription.surfaceId,
            expected: this.manifestVersion,
            received: prescription.manifestVersion,
          },
        ),
      );
      // Fire-and-forget reject feedback
      this.feedback({
        prescriptionId: prescription.id,
        action: "reject",
        reason: "manifest-mismatch",
        timestamp: new Date().toISOString(),
      }).catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to send reject feedback";
        this.notifyError(
          new AuraClientError(msg, ErrorCodes.REQUEST_FAILED, {
            prescriptionId: prescription.id,
            feedbackAction: "reject",
          }),
        );
      });
      return;
    }

    // Admission check 2: stale context lock
    if (prescription.contextLock.sequenceId !== this.contextSequenceId) {
      this.notifyError(
        new AuraClientError(
          `Prescription discarded: contextLock.sequenceId ${prescription.contextLock.sequenceId} does not match current ${this.contextSequenceId}`,
          ErrorCodes.STALE_CONTEXT_LOCK,
          {
            prescriptionId: prescription.id,
            surfaceId: prescription.surfaceId,
            expected: this.contextSequenceId,
            received: prescription.contextLock.sequenceId,
          },
        ),
      );
      // Fire-and-forget reject feedback
      this.feedback({
        prescriptionId: prescription.id,
        action: "reject",
        reason: "stale-context",
        timestamp: new Date().toISOString(),
      }).catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to send reject feedback";
        this.notifyError(
          new AuraClientError(msg, ErrorCodes.REQUEST_FAILED, {
            prescriptionId: prescription.id,
            feedbackAction: "reject",
          }),
        );
      });
      return;
    }

    // Admission check 3: expired prescription
    const expiresAt = new Date(prescription.constraints.expiresAt).getTime();
    if (isNaN(expiresAt) || expiresAt <= Date.now()) {
      this.notifyError(
        new AuraClientError(
          `Prescription discarded: already expired at ${prescription.constraints.expiresAt}`,
          ErrorCodes.PRESCRIPTION_EXPIRED,
          {
            prescriptionId: prescription.id,
            surfaceId: prescription.surfaceId,
            expiresAt: prescription.constraints.expiresAt,
          },
        ),
      );
      return;
    }

    // All admission checks passed — store in PrescriptionStore
    this.prescriptionStore.store(
      prescription,
      this.contextSequenceId,
      this.manifestVersion,
    );
  }

  private startEvictionSweep(): void {
    const interval = this.config.options?.expiryCheckInterval ?? 5000;
    this.evictionInterval = setInterval(() => {
      const evicted = this.prescriptionStore.evictExpiredAndStale(
        this.contextSequenceId,
      );
      // Notify listeners for evicted surfaces
      for (const surfaceId of evicted) {
        this.prescriptionStore.notifyListeners(surfaceId, undefined);
      }
    }, interval);
  }

  private flushQueue(): void {
    const events = this.eventQueue.flush();
    if (events.length === 0) {
      return;
    }

    // Fire-and-forget: POST events to /aura/events
    this.postEvents(events).catch((error: unknown) => {
      // On failure, re-enqueue events
      for (const event of events) {
        this.eventQueue.enqueue(event);
      }
      const message =
        error instanceof Error ? error.message : "Failed to flush events";
      this.notifyError(
        new AuraClientError(message, ErrorCodes.REQUEST_FAILED, {
          eventCount: events.length,
        }),
      );
    });
  }

  private async postEvents(events: AuraEvent[]): Promise<void> {
    await this.transport.post(
      "/aura/events",
      {
        sessionId: this.sessionId,
        events: events as [AuraEvent, ...AuraEvent[]],
        contextSequenceId: this.contextSequenceId,
      },
      EventsRequestSchema,
      undefined,
      this.sessionId,
    );
  }
}
