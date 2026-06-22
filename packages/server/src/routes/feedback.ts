/**
 * POST /aura/feedback route handler.
 *
 * Validates the request body, looks up the session, stores the FeedbackEvent
 * in the FeedbackStore (append-only), and returns 200 with status "accepted".
 * Accepts all 6 action types: accept, dismiss, override, undo, reject, error.
 */

import type { Context } from "hono";
import { FeedbackRequestSchema } from "@aura/protocol";
import type { ISessionStore, IFeedbackStore } from "../storage/interfaces.js";

export function createFeedbackHandler(deps: {
  sessionStore: ISessionStore;
  feedbackStore: IFeedbackStore;
}): (c: Context) => Promise<Response> {
  const { sessionStore, feedbackStore } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Parse body JSON
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ errors: [{ field: "body", message: "Invalid JSON" }] }, 400);
    }

    // 2. Validate with FeedbackRequestSchema
    const parseResult = FeedbackRequestSchema.safeParse(body);
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

    // 4. Store feedback (append-only)
    await feedbackStore.record(data.sessionId, data.feedback);

    // 5. Return 200 with accepted status
    return c.json({ status: "accepted" }, 200);
  };
}
