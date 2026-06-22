/**
 * POST /aura/profile/correction route handler.
 *
 * Validates the request body, looks up the session, checks correction eligibility
 * via SecurityAuditor, and performs the requested correction action (remove or correct)
 * on the user's profile attributes.
 */

import type { Context } from "hono";
import { ProfileCorrectionRequestSchema } from "@aura/protocol";
import type { ISessionStore, IUserModelStore } from "../storage/interfaces.js";
import type { ISecurityAuditor } from "../services/security-auditor.js";
import type { SecurityPolicyConfig } from "../types/config.types.js";

export function createCorrectionHandler(deps: {
  sessionStore: ISessionStore;
  userModelStore: IUserModelStore;
  securityAuditor: ISecurityAuditor;
  securityPolicy: SecurityPolicyConfig;
}): (c: Context) => Promise<Response> {
  const { sessionStore, userModelStore, securityAuditor, securityPolicy } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Parse body JSON
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ errors: [{ field: "body", message: "Invalid JSON" }] }, 400);
    }

    // 2. Validate with ProfileCorrectionRequestSchema
    const parseResult = ProfileCorrectionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json({ errors }, 400);
    }

    const data = parseResult.data;

    // 3. Look up session
    const session = await sessionStore.get(data.sessionId);
    if (!session) {
      return c.json({ message: "Session not found" }, 404);
    }

    // 4. Check correction eligibility via SecurityAuditor
    const eligible = securityAuditor.isCorrectionEligible(
      data.correction.attributeId,
      securityPolicy,
    );
    if (!eligible) {
      return c.json({ message: "Correction not permitted for this attribute" }, 403);
    }

    // 5. Get existing attribute
    const existingAttr = await userModelStore.getAttribute(
      session.userId,
      data.correction.attributeId,
    );
    if (!existingAttr) {
      return c.json({ message: "Attribute not found" }, 404);
    }

    // 6. Handle action
    if (data.correction.action === "remove") {
      await userModelStore.deleteAttribute(session.userId, data.correction.attributeId);
      return c.json({ status: "accepted" }, 200);
    }

    // action === "correct"
    const updatedAttr = {
      ...existingAttr,
      value: data.correction.newValue,
      provenance: "explicit" as const,
      confidence: 1.0,
    };
    await userModelStore.upsertAttribute(session.userId, updatedAttr);
    return c.json({ status: "accepted", updatedAttribute: updatedAttr }, 200);
  };
}
