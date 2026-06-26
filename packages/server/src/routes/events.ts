/**
 * POST /aura/events route handler.
 *
 * Validates the request body, looks up the session, filters events through
 * consent enforcement, scans for injection, builds the RulesPipelineInput,
 * invokes the pipeline with a configurable timeout, and passes resulting
 * candidates through the PrescriptionEmitter before returning counts.
 */

import type { Context } from "hono";
import type { UIPrescription } from "@aura/protocol";
import { EventsRequestSchema } from "@aura/protocol";
import type { ISessionStore, IContextStore, IUserModelStore } from "../storage/interfaces.js";
import type { IConsentEnforcer } from "../services/consent-enforcer.js";
import type { IPrescriptionEmitter, EmissionContext } from "../services/prescription-emitter.js";
import type { ISecurityAuditor } from "../services/security-auditor.js";
import type { IRulesPipeline, LatencyBudgetConfig } from "../types/config.types.js";
import type { RulesPipelineInput } from "../types/internal.types.js";
import type { IDevtoolsAccumulator } from "../devtools/accumulator.js";

/**
 * Factory that creates the POST /aura/events route handler.
 *
 * Orchestrates the full event processing pipeline:
 * 1. Validate request body
 * 2. Look up session
 * 3. Filter events through consent
 * 4. Scan for injection indicators
 * 5. Gather context and profile attributes
 * 6. Invoke rules pipeline with timeout
 * 7. Emit valid prescriptions
 */
export function createEventsHandler(deps: {
  sessionStore: ISessionStore;
  contextStore: IContextStore;
  userModelStore: IUserModelStore;
  pipeline: IRulesPipeline;
  consentEnforcer: IConsentEnforcer;
  prescriptionEmitter: IPrescriptionEmitter;
  securityAuditor: ISecurityAuditor;
  config: { pipelineTimeoutMs: number; latencyBudgets: LatencyBudgetConfig };
  devtools?: IDevtoolsAccumulator;
}): (c: Context) => Promise<Response> {
  const {
    sessionStore,
    contextStore,
    userModelStore,
    pipeline,
    consentEnforcer,
    prescriptionEmitter,
    securityAuditor,
    config,
    devtools,
  } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Parse and validate the request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ errors: [{ field: "body", message: "Invalid JSON" }] }, 400);
    }

    const parseResult = EventsRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json({ errors }, 400);
    }

    const { sessionId, events } = parseResult.data;

    // 2. Look up session
    const session = await sessionStore.get(sessionId);
    if (!session) {
      return c.json({ message: "Session not found" }, 404);
    }

    // 3. Filter events through consent enforcer
    const filteredEvents = consentEnforcer.filterEvents(events, session.consentProfile);

    // Record filtered events in devtools accumulator
    if (devtools && filteredEvents.length > 0) {
      devtools.recordEvents(sessionId, filteredEvents);
    }

    // 4. Scan filtered events via security auditor — log if not clean but don't block
    const scanResult = securityAuditor.scanForInjection(filteredEvents, sessionId);
    if (!scanResult.clean) {
      const timestamp = new Date().toISOString();
      securityAuditor.record({
        timestamp,
        sessionId,
        type: "prompt-injection",
        detail: scanResult.indicators.join("; "),
        severity: "warn",
      });
      devtools?.recordSecurityEvent(sessionId, {
        id: `sec-${Date.now()}`,
        category: "prompt-injection",
        reason: scanResult.indicators.join("; "),
        timestamp,
      });
    }

    // 5. Get current context from context store
    const currentContext = await contextStore.get(sessionId);
    if (!currentContext) {
      // No context stored — return accepted with count (graceful handling)
      return c.json({ status: "accepted", count: filteredEvents.length }, 200);
    }

    // 6. Get profile attributes and filter through consent
    const attributes = await userModelStore.getAttributes(session.userId);
    const filteredAttributes = consentEnforcer.filterPipelineAttributes(
      attributes,
      session.consentProfile,
    );

    // 7. Build RulesPipelineInput
    const pipelineInput: RulesPipelineInput = {
      events: filteredEvents,
      context: currentContext,
      contextSequenceId: session.contextSequenceId,
      consentProfile: session.consentProfile,
      profileAttributes: filteredAttributes,
      manifest: session.manifest,
    };

    // 8. Invoke pipeline with timeout
    const evaluationStartTime = performance.now();
    let candidates: UIPrescription[] = [];
    try {
      candidates = await Promise.race([
        pipeline.evaluate(pipelineInput),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Pipeline timeout")), config.pipelineTimeoutMs),
        ),
      ]);
    } catch {
      // Pipeline errors are internal — return 200 with accepted status
      return c.json({ status: "accepted", count: filteredEvents.length }, 200);
    }

    // 9. Process each candidate through PrescriptionEmitter
    const emissionContext: EmissionContext = {
      consentProfile: session.consentProfile,
      currentContextSequenceId: session.contextSequenceId,
      currentServerTime: new Date().toISOString(),
      latencyBudgets: config.latencyBudgets,
      evaluationStartTime,
    };

    for (const candidate of candidates) {
      await prescriptionEmitter.emit(candidate, session, emissionContext);
    }

    // 10. Return 200 with accepted status and event count
    return c.json({ status: "accepted", count: filteredEvents.length }, 200);
  };
}
