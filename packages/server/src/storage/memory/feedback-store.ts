import type { IFeedbackStore } from "../interfaces.js";
import type { FeedbackEvent } from "../../types/internal.types.js";

/**
 * Creates an in-memory implementation of IFeedbackStore.
 * Feedback events are stored append-only and never overwritten.
 * Data does not persist across restarts.
 */
export function createInMemoryFeedbackStore(): IFeedbackStore {
  // Map<sessionId, Map<prescriptionId, FeedbackEvent[]>>
  const store = new Map<string, Map<string, FeedbackEvent[]>>();

  return {
    async record(sessionId, event) {
      let sessionFeedback = store.get(sessionId);
      if (!sessionFeedback) {
        sessionFeedback = new Map();
        store.set(sessionId, sessionFeedback);
      }
      let events = sessionFeedback.get(event.prescriptionId);
      if (!events) {
        events = [];
        sessionFeedback.set(event.prescriptionId, events);
      }
      events.push(structuredClone(event));
    },

    async getByPrescriptionId(sessionId, prescriptionId) {
      const sessionFeedback = store.get(sessionId);
      if (!sessionFeedback) return [];
      const events = sessionFeedback.get(prescriptionId);
      if (!events) return [];
      return events.map((e) => structuredClone(e));
    },
  };
}
