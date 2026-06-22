import type { IPrescriptionStore } from "../interfaces.js";
import type { UIPrescription } from "../../types/internal.types.js";

/**
 * Creates an in-memory implementation of IPrescriptionStore.
 * Data is stored in a nested Map (sessionId → prescriptionId → UIPrescription)
 * and does not persist across restarts.
 */
export function createInMemoryPrescriptionStore(): IPrescriptionStore {
  // Map<sessionId, Map<prescriptionId, UIPrescription>>
  const store = new Map<string, Map<string, UIPrescription>>();

  return {
    async store(sessionId, prescription) {
      let sessionPrescriptions = store.get(sessionId);
      if (!sessionPrescriptions) {
        sessionPrescriptions = new Map();
        store.set(sessionId, sessionPrescriptions);
      }
      sessionPrescriptions.set(prescription.id, structuredClone(prescription));
    },

    async get(sessionId, prescriptionId) {
      const sessionPrescriptions = store.get(sessionId);
      if (!sessionPrescriptions) return null;
      const prescription = sessionPrescriptions.get(prescriptionId);
      return prescription ? structuredClone(prescription) : null;
    },

    async listActive(sessionId, asOf) {
      const sessionPrescriptions = store.get(sessionId);
      if (!sessionPrescriptions) return [];
      const asOfTime = new Date(asOf).getTime();
      return Array.from(sessionPrescriptions.values())
        .filter((p) => new Date(p.constraints.expiresAt).getTime() > asOfTime)
        .map((p) => structuredClone(p));
    },
  };
}
