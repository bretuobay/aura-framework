/**
 * Server-side route handler for the devtools state endpoint.
 *
 * Registers GET /aura/devtools/state on a Hono app instance.
 * This route is opt-in — it is never exposed unless registerDevtoolsRoute
 * is explicitly called by the host application.
 */

import type { Hono, Context } from "hono";
import type {
  CapabilityManifest,
  AuraEvent,
  ConsentProfile,
  ProfileAttribute,
  FeedbackEvent,
} from "@aura/protocol";
import type {
  DevtoolsState,
  SessionMetadata,
  PrescriptionEntry,
  RuleMatchRecord,
  OperationalAuditEntry,
  SecurityAuditRecord,
} from "./schema";

// --- Storage Adapter Interfaces ---
// These are defined locally because @aura/devtools must not import from @aura/server.
// They mirror the conceptual interfaces the server uses internally.

export interface SessionStorage {
  getSession(sessionId: string): Promise<SessionMetadata | null>;
}

export interface EventStorage {
  getEvents(sessionId: string): Promise<AuraEvent[]>;
}

export interface PrescriptionStorage {
  getPrescriptions(sessionId: string): Promise<PrescriptionEntry[]>;
}

export interface ConsentStorage {
  getConsent(sessionId: string): Promise<ConsentProfile>;
}

export interface ProfileStorage {
  getAttributes(sessionId: string): Promise<ProfileAttribute[]>;
}

export interface FeedbackStorage {
  getFeedback(sessionId: string): Promise<FeedbackEvent[]>;
}

export interface RuleMatchStorage {
  getRuleMatches(sessionId: string): Promise<RuleMatchRecord[]>;
}

export interface AuditStorage {
  getAuditEntries(sessionId: string): Promise<OperationalAuditEntry[]>;
}

export interface SecurityAuditStorage {
  getSecurityRecords(sessionId: string): Promise<SecurityAuditRecord[]>;
}

// --- Route Options ---

export interface RegisterDevtoolsRouteOptions {
  /** The Hono app instance to mount the route on */
  app: Hono;
  /** The same StorageAdapter instances used by registerAuipRoutes */
  storage: {
    sessions: SessionStorage;
    events: EventStorage;
    prescriptions: PrescriptionStorage;
    consent: ConsentStorage;
    profile: ProfileStorage;
    feedback: FeedbackStorage;
    ruleMatches: RuleMatchStorage;
    audit: AuditStorage;
    security: SecurityAuditStorage;
  };
}

// --- Manifest Storage Interface ---
// The manifest is fetched as part of the session in many implementations,
// but the design specifies it as a separate parallel fetch.
// We include it via the sessions storage since SessionMetadata doesn't carry the full manifest.

export interface ManifestStorage {
  getManifest(sessionId: string): Promise<CapabilityManifest>;
}

/**
 * Extended options that include a manifest storage adapter.
 * If not provided, the route handler will use a default empty manifest.
 */
export interface RegisterDevtoolsRouteOptionsWithManifest extends RegisterDevtoolsRouteOptions {
  storage: RegisterDevtoolsRouteOptions["storage"] & {
    manifest?: ManifestStorage;
  };
}

/**
 * Registers the GET /aura/devtools/state route on the provided Hono app.
 *
 * The route fetches all session data in parallel from the provided storage
 * adapters and returns a combined DevtoolsState JSON snapshot.
 *
 * This function is opt-in: the route is never exposed unless this function
 * is explicitly called by the host application.
 */
export function registerDevtoolsRoute(options: RegisterDevtoolsRouteOptionsWithManifest): void {
  const { app, storage } = options;

  app.get("/aura/devtools/state", async (c: Context) => {
    // 1. Extract sessionId from query params
    const sessionId = c.req.query("sessionId");

    // 2. If missing → 400
    if (!sessionId) {
      return c.json({ error: "sessionId query parameter is required" }, 400);
    }

    // 3. Fetch session metadata
    const session = await storage.sessions.getSession(sessionId);

    // 4. If not found → 404
    if (!session) {
      return c.json({ error: `Session not found: ${sessionId}` }, 404);
    }

    // 5. Fetch all data in parallel from 9 storage adapters
    const [
      manifest,
      events,
      prescriptions,
      ruleMatches,
      consentProfile,
      profileAttributes,
      feedbackHistory,
      operationalAudit,
      securityAudit,
    ] = await Promise.all([
      storage.manifest
        ? storage.manifest.getManifest(sessionId)
        : Promise.resolve({ surfaces: [] } as CapabilityManifest),
      storage.events.getEvents(sessionId),
      storage.prescriptions.getPrescriptions(sessionId),
      storage.ruleMatches.getRuleMatches(sessionId),
      storage.consent.getConsent(sessionId),
      storage.profile.getAttributes(sessionId),
      storage.feedback.getFeedback(sessionId),
      storage.audit.getAuditEntries(sessionId),
      storage.security.getSecurityRecords(sessionId),
    ]);

    // 6. Assemble DevtoolsState object
    const state: DevtoolsState = {
      session,
      manifest,
      events,
      prescriptions,
      ruleMatches,
      consentProfile,
      profileAttributes,
      feedbackHistory,
      operationalAudit,
      securityAudit,
    };

    // 7. Return 200 with JSON body
    return c.json(state, 200);
  });
}
