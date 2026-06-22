/**
 * GET /aura/explain/:id route handler.
 *
 * Looks up an ExplanationRecord by prescription ID, validates session
 * ownership via the PrescriptionStore, and returns the record or
 * appropriate error status.
 */

import type { Context } from "hono";
import type {
  ISessionStore,
  IExplanationStore,
  IPrescriptionStore,
} from "../storage/interfaces.js";

export function createExplainHandler(deps: {
  sessionStore: ISessionStore;
  explanationStore: IExplanationStore;
  prescriptionStore: IPrescriptionStore;
}): (c: Context) => Promise<Response> {
  const { sessionStore, explanationStore, prescriptionStore } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Get prescription ID from route param
    const prescriptionId = c.req.param("id");
    if (!prescriptionId) {
      return c.json(
        { errors: [{ field: "id", message: "Prescription ID is required" }] },
        400
      );
    }

    // 2. Get sessionId from query parameter
    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      return c.json(
        { errors: [{ field: "sessionId", message: "sessionId query parameter is required" }] },
        400
      );
    }

    // 3. Look up session — 404 if not found
    const session = await sessionStore.get(sessionId);
    if (!session) {
      return c.json({ message: "Session not found" }, 404);
    }

    // 4. Look up explanation — 404 if not found
    const explanation = await explanationStore.get(prescriptionId);
    if (!explanation) {
      return c.json({ message: "Explanation not found" }, 404);
    }

    // 5. Verify session ownership via prescription store — 403 if mismatch
    const prescription = await prescriptionStore.get(sessionId, prescriptionId);
    if (!prescription) {
      return c.json({ message: "Forbidden" }, 403);
    }

    // 6. Return 200 with explanation record
    return c.json({ explanation }, 200);
  };
}
