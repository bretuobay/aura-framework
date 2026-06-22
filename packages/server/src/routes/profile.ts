/**
 * GET /aura/profile route handler.
 *
 * Looks up the session by sessionId query parameter, retrieves all
 * ProfileAttributes from the UserModelStore for the session's user,
 * filters through the ConsentEnforcer (excludes revoked dataClass and expired),
 * and returns 200 with the filtered attributes array (or empty array).
 */

import type { Context } from "hono";
import type { ISessionStore, IUserModelStore } from "../storage/interfaces.js";
import type { IConsentEnforcer } from "../services/consent-enforcer.js";

export function createProfileHandler(deps: {
  sessionStore: ISessionStore;
  userModelStore: IUserModelStore;
  consentEnforcer: IConsentEnforcer;
}): (c: Context) => Promise<Response> {
  const { sessionStore, userModelStore, consentEnforcer } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Get sessionId from query parameter
    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      return c.json(
        { message: "Missing sessionId query parameter" },
        400
      );
    }

    // 2. Look up session — 404 if not found
    const session = await sessionStore.get(sessionId);
    if (!session) {
      return c.json({ message: "Session not found" }, 404);
    }

    // 3. Retrieve all attributes for the user
    const attributes = await userModelStore.getAttributes(session.userId);

    // 4. Filter through consent enforcer (handles consent + expiry filtering)
    const filteredAttributes = consentEnforcer.filterProfileAttributes(
      attributes,
      session.consentProfile,
      new Date().toISOString()
    );

    // 5. Return 200 with filtered attributes
    return c.json({ attributes: filteredAttributes }, 200);
  };
}
