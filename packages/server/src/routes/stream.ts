/**
 * GET /aura/prescriptions/stream route handler.
 *
 * Opens an SSE connection for a session, registers it in the StreamRegistry,
 * handles Last-Event-ID reconnection by replaying active prescriptions,
 * and cleans up on client disconnect.
 */

import type { Context } from "hono";
import type { ISessionStore, IPrescriptionStore } from "../storage/interfaces.js";
import type { SSEConnection, IStreamRegistry } from "../services/stream-registry.js";

export function createStreamHandler(deps: {
  sessionStore: ISessionStore;
  streamRegistry: IStreamRegistry;
  prescriptionStore: IPrescriptionStore;
}): (c: Context) => Promise<Response> {
  const { sessionStore, streamRegistry, prescriptionStore } = deps;

  return async (c: Context): Promise<Response> => {
    // 1. Get sessionId from query parameter
    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      return c.json({ message: "Missing sessionId query parameter" }, 400);
    }

    // 2. Look up session — if not found or not active, return 404
    const session = await sessionStore.get(sessionId);
    if (!session || session.status !== "active") {
      return c.json({ message: "Session not found" }, 404);
    }

    // 3. Create a TransformStream for SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 4. Create SSE connection object
    const connectionId = crypto.randomUUID();
    const connection: SSEConnection = {
      id: connectionId,
      sessionId,
      write(event: string, data: string, id?: string) {
        let sseMessage = "";
        if (id) sseMessage += `id: ${id}\n`;
        sseMessage += `event: ${event}\ndata: ${data}\n\n`;
        writer.write(encoder.encode(sseMessage)).catch(() => {});
      },
      close() {
        writer.close().catch(() => {});
      },
    };

    // 5. Register connection in StreamRegistry
    streamRegistry.register(sessionId, connection);

    // 6. Handle Last-Event-ID for reconnection
    const lastEventId = c.req.header("Last-Event-ID");
    if (lastEventId) {
      // Replay active prescriptions that are not expired
      const now = new Date().toISOString();
      const active = await prescriptionStore.listActive(sessionId, now);
      for (const rx of active) {
        connection.write("prescription", JSON.stringify(rx), rx.id);
      }
    }

    // 7. Handle disconnect cleanup via AbortSignal
    c.req.raw.signal?.addEventListener("abort", () => {
      streamRegistry.remove(connectionId);
    });

    // 8. Return SSE response with appropriate headers
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  };
}
