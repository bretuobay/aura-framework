import type { IExplanationStore } from "../interfaces.js";
import type { ExplanationRecord } from "../../types/internal.types.js";

/**
 * Creates an in-memory implementation of IExplanationStore.
 * Data is stored in a Map and does not persist across restarts.
 */
export function createInMemoryExplanationStore(): IExplanationStore {
  const explanations = new Map<string, ExplanationRecord>();

  return {
    async store(prescriptionId, explanation) {
      explanations.set(prescriptionId, structuredClone(explanation));
    },

    async get(prescriptionId) {
      const record = explanations.get(prescriptionId);
      return record ? structuredClone(record) : null;
    },
  };
}
