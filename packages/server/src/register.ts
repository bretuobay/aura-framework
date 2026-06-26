/**
 * registerAuipRoutes — primary integration point for @aura/server.
 *
 * Accepts a Hono application and an AuraServerConfig, resolves defaults,
 * instantiates core services, and mounts all 9 AUIP v0 route handlers.
 */

import type { Hono } from "hono";
import type { AuraServerConfig } from "./types/config.types.js";
import { resolveConfig } from "./config.js";
import { createCapabilityRegistry } from "./services/capability-registry.js";
import { createConsentEnforcer } from "./services/consent-enforcer.js";
import { createStreamRegistry } from "./services/stream-registry.js";
import { createPrescriptionEmitter } from "./services/prescription-emitter.js";
import { createSecurityAuditor } from "./services/security-auditor.js";
import { createSessionHandler } from "./routes/session.js";
import { createEventsHandler } from "./routes/events.js";
import { createContextHandler } from "./routes/context.js";
import { createStreamHandler } from "./routes/stream.js";
import { createFeedbackHandler } from "./routes/feedback.js";
import { createExplainHandler } from "./routes/explain.js";
import { createConsentHandler } from "./routes/consent.js";
import { createProfileHandler } from "./routes/profile.js";
import { createCorrectionHandler } from "./routes/correction.js";

/**
 * Mounts all 9 AUIP v0 endpoints onto a Hono application.
 *
 * @param app - A Hono application instance
 * @param config - Server configuration (pipeline required, all else optional)
 */
export function registerAuipRoutes(app: Hono, config: AuraServerConfig): void {
  const resolved = resolveConfig(config);

  // Instantiate core services
  const capabilityRegistry = createCapabilityRegistry();
  const consentEnforcer = createConsentEnforcer();
  const streamRegistry = createStreamRegistry();
  const securityAuditor = createSecurityAuditor({
    injectionPatterns: resolved.securityPolicy?.promptInjectionPatterns,
    replayWindowMs: resolved.replayWindowMs,
    protectedAttributes: resolved.securityPolicy?.protectedAttributes,
  });
  const prescriptionEmitter = createPrescriptionEmitter({
    capabilityRegistry,
    consentEnforcer,
    streamRegistry,
    prescriptionStore: resolved.prescriptionStore,
    explanationStore: resolved.explanationStore,
    devtools: resolved.devtools,
  });

  // Shared dependencies for route handlers
  const deps = {
    sessionStore: resolved.sessionStore,
    contextStore: resolved.contextStore,
    userModelStore: resolved.userModelStore,
    feedbackStore: resolved.feedbackStore,
    explanationStore: resolved.explanationStore,
    prescriptionStore: resolved.prescriptionStore,
    pipeline: resolved.pipeline,
    capabilityRegistry,
    consentEnforcer,
    streamRegistry,
    prescriptionEmitter,
    securityAuditor,
    securityPolicy: resolved.securityPolicy ?? {},
    config: resolved,
    devtools: resolved.devtools,
  };

  // Mount route handlers
  app.post("/aura/session", createSessionHandler(deps));
  app.post("/aura/events", createEventsHandler(deps));
  app.post("/aura/context", createContextHandler(deps));
  app.get("/aura/prescriptions/stream", createStreamHandler(deps));
  app.post("/aura/feedback", createFeedbackHandler(deps));
  app.get("/aura/explain/:id", createExplainHandler(deps));
  app.post("/aura/consent", createConsentHandler(deps));
  app.get("/aura/profile", createProfileHandler(deps));
  app.post("/aura/profile/correction", createCorrectionHandler(deps));
}
