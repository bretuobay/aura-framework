import type { Context } from "hono";
import { ContextRequestSchema } from "@aura/protocol";
import type { ContextModel } from "@aura/protocol";
import type { ISessionStore, IContextStore } from "../storage/interfaces.js";

/**
 * Factory that creates the POST /aura/context route handler.
 *
 * Validates the request body, enforces monotonic contextSequenceId,
 * merges the contextPatch into the stored ContextModel, and updates
 * the session's contextSequenceId.
 */
export function createContextHandler(deps: {
  sessionStore: ISessionStore;
  contextStore: IContextStore;
}): (c: Context) => Promise<Response> {
  const { sessionStore, contextStore } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Parse and validate the request body
    const body = await c.req.json();
    const parsed = ContextRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        400,
      );
    }

    const { sessionId, contextPatch, contextSequenceId } = parsed.data;

    // 2. Look up the session
    const session = await sessionStore.get(sessionId);

    if (!session) {
      return c.json({ message: "Session not found" }, 404);
    }

    // 3. Monotonicity check: if incoming sequenceId is stale, return early
    if (contextSequenceId < session.contextSequenceId) {
      return c.json(
        {
          status: "accepted" as const,
          sequenceId: session.contextSequenceId,
          stale: true,
        },
        200,
      );
    }

    // 4. Get current context
    const currentContext = await contextStore.get(sessionId);

    // 5. Merge patch onto existing context
    const merged = { ...currentContext, ...contextPatch } as ContextModel;

    // 6. Store merged context
    await contextStore.set(sessionId, merged);

    // 7. Update session's contextSequenceId
    await sessionStore.update(sessionId, {
      contextSequenceId,
      updatedAt: new Date().toISOString(),
    });

    // 8. Return success response
    return c.json(
      {
        status: "accepted" as const,
        sequenceId: contextSequenceId,
      },
      200,
    );
  };
}
