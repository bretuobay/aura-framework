import type { ISessionStore } from "../interfaces.js";
import type { SessionRecord } from "../../types/internal.types.js";

/**
 * Creates an in-memory implementation of ISessionStore.
 * Data is stored in a Map and does not persist across restarts.
 */
export function createInMemorySessionStore(): ISessionStore {
  const sessions = new Map<string, SessionRecord>();

  return {
    async create(record) {
      if (sessions.has(record.sessionId)) {
        throw new Error(`Session ${record.sessionId} already exists`);
      }
      sessions.set(record.sessionId, structuredClone(record));
    },

    async get(sessionId) {
      const record = sessions.get(sessionId);
      return record ? structuredClone(record) : null;
    },

    async update(sessionId, patch) {
      const existing = sessions.get(sessionId);
      if (!existing) {
        throw new Error(`Session ${sessionId} not found`);
      }
      sessions.set(sessionId, { ...existing, ...patch });
    },

    async delete(sessionId) {
      sessions.delete(sessionId);
    },
  };
}
