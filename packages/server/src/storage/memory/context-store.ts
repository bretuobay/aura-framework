import type { IContextStore } from "../interfaces.js";
import type { ContextModel } from "../../types/internal.types.js";

/**
 * Creates an in-memory implementation of IContextStore.
 * Data is stored in a Map and does not persist across restarts.
 * All reads and writes use structuredClone to prevent aliasing.
 */
export function createInMemoryContextStore(): IContextStore {
  const contexts = new Map<string, ContextModel>();

  return {
    async set(sessionId, context) {
      contexts.set(sessionId, structuredClone(context));
    },

    async get(sessionId) {
      const context = contexts.get(sessionId);
      return context ? structuredClone(context) : null;
    },
  };
}
