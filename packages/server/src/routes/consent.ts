/**
 * POST /aura/consent route handler.
 *
 * Validates the request body, looks up the session, merges the consent patch
 * into the stored ConsentProfile, cascades revocation by expiring affected
 * ProfileAttributes, and returns the effective consent profile.
 */

import type { Context } from "hono";
import type { ConsentProfile, DataClass } from "@aura/protocol";
import { ConsentRequestSchema } from "@aura/protocol";
import type { ISessionStore, IUserModelStore, IPrescriptionStore } from "../storage/interfaces.js";

/**
 * Factory that creates the POST /aura/consent route handler.
 *
 * Orchestrates the consent update flow:
 * 1. Parse and validate the request body
 * 2. Look up the session
 * 3. Merge consentPatch into stored ConsentProfile
 * 4. Cascade revocation: expire affected ProfileAttributes
 * 5. Return effective consent profile
 */
export function createConsentHandler(deps: {
  sessionStore: ISessionStore;
  userModelStore: IUserModelStore;
  prescriptionStore: IPrescriptionStore;
}): (c: Context) => Promise<Response> {
  const { sessionStore, userModelStore } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Parse body JSON
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ errors: [{ field: "body", message: "Invalid JSON" }] }, 400);
    }

    // 2. Validate with ConsentRequestSchema
    const parseResult = ConsentRequestSchema.safeParse(body);
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

    // 4. Determine which data classes are being newly revoked
    const previousProfile = session.consentProfile;
    const newlyRevokedClasses: DataClass[] = [];
    for (const [key, value] of Object.entries(data.consentPatch)) {
      if (value === false && previousProfile[key as DataClass] !== false) {
        newlyRevokedClasses.push(key as DataClass);
      }
    }

    // 5. Merge consent: apply patch over existing profile
    const effectiveProfile: ConsentProfile = {
      ...session.consentProfile,
      ...data.consentPatch,
    };

    // 6. Update session with new consent profile
    const now = new Date().toISOString();
    await sessionStore.update(data.sessionId, {
      consentProfile: effectiveProfile,
      updatedAt: now,
    });

    // 7. Cascade revocation: expire affected ProfileAttributes
    if (newlyRevokedClasses.length > 0) {
      const attributes = await userModelStore.getAttributes(session.userId);
      for (const attr of attributes) {
        if (newlyRevokedClasses.includes(attr.dataClass)) {
          // Expire the attribute by setting expiresAt to now
          await userModelStore.upsertAttribute(session.userId, {
            ...attr,
            expiresAt: now,
          });
        }
      }
    }

    // 8. Return 200 with accepted status and effective profile
    return c.json({ status: "accepted", effectiveProfile }, 200);
  };
}
