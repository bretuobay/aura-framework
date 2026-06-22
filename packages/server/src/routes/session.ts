/**
 * POST /aura/session route handler.
 *
 * Validates the request body, creates a SessionRecord, registers the manifest
 * in the CapabilityRegistry, stores context and consent, and returns
 * a SessionResponse with status "active".
 */

import type { Context } from "hono";
import { SessionRequestSchema, CapabilityManifestSchema } from "@aura/protocol";
import type { ISessionStore, IContextStore } from "../storage/interfaces.js";
import type { ICapabilityRegistry } from "../services/capability-registry.js";
import type { SessionRecord } from "../types/internal.types.js";

export function createSessionHandler(deps: {
  sessionStore: ISessionStore;
  contextStore: IContextStore;
  capabilityRegistry: ICapabilityRegistry;
}): (c: Context) => Promise<Response> {
  const { sessionStore, contextStore, capabilityRegistry } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Parse body JSON
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        { errors: [{ field: "body", message: "Invalid JSON" }] },
        400
      );
    }

    // 2. Validate with SessionRequestSchema
    const parseResult = SessionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json({ errors }, 400);
    }

    const data = parseResult.data;

    // 3. Additionally validate manifest with CapabilityManifestSchema
    const manifestResult = CapabilityManifestSchema.safeParse(data.manifest);
    if (!manifestResult.success) {
      const errors = manifestResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json({ errors }, 422);
    }

    // 4. Check if session already exists
    const existing = await sessionStore.get(data.sessionId);
    if (existing) {
      return c.json({ message: "Session already exists" }, 409);
    }

    // 5. Create SessionRecord
    const now = new Date().toISOString();
    const record: SessionRecord = {
      sessionId: data.sessionId,
      userId: data.userId,
      manifest: data.manifest,
      manifestVersion: data.manifest.version ?? "unversioned",
      consentProfile: data.consentProfile,
      contextSequenceId: data.contextSequenceId ?? 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    // 6. Store session, context, and register manifest
    await sessionStore.create(record);
    await contextStore.set(data.sessionId, data.context);
    capabilityRegistry.register(data.sessionId, data.manifest);

    // 7. Return 200 with session response
    return c.json({ sessionId: data.sessionId, status: "active" }, 200);
  };
}
