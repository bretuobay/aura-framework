/**
 * registerDevtoolsRoute — mounts GET /aura/devtools/state on a Hono app.
 *
 * Returns a full DevtoolsState snapshot for the given sessionId, combining
 * data from the main stores and the devtools accumulator. Should only be
 * mounted in development and staging environments.
 */

import type { Hono } from "hono";
import type { ISessionStore, IUserModelStore, IFeedbackStore } from "../storage/interfaces.js";
import type { IDevtoolsAccumulator } from "./accumulator.js";

export interface DevtoolsRouteConfig {
  app: Hono;
  sessionStore: ISessionStore;
  userModelStore: IUserModelStore;
  feedbackStore: IFeedbackStore;
  accumulator: IDevtoolsAccumulator;
}

export function registerDevtoolsRoute(config: DevtoolsRouteConfig): void {
  const { app, sessionStore, userModelStore, feedbackStore, accumulator } = config;

  app.get("/aura/devtools/state", async (c) => {
    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      return c.json({ error: "sessionId query parameter is required" }, 400);
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const [profileAttributes, feedbackHistory] = await Promise.all([
      userModelStore.getAttributes(session.userId),
      feedbackStore.listAll(sessionId),
    ]);

    const state = {
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        // SessionRecord uses "terminated"; DevtoolsState schema uses "rejected"
        status: session.status === "active" ? "active" : "rejected",
        manifestVersion: session.manifestVersion,
        contextSequenceId: session.contextSequenceId,
        createdAt: session.createdAt,
      },
      manifest: session.manifest,
      events: accumulator.getEvents(sessionId),
      prescriptions: accumulator.getPrescriptionEntries(sessionId),
      ruleMatches: [], // v0: pipeline does not emit structured match records
      consentProfile: session.consentProfile,
      profileAttributes,
      feedbackHistory,
      operationalAudit: accumulator.getOperationalAudit(sessionId),
      securityAudit: accumulator.getSecurityAudit(sessionId),
    };

    return c.json(state);
  });
}
