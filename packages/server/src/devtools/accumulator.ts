/**
 * DevtoolsAccumulator — in-process store for devtools observability data.
 *
 * Accumulates events, prescription dispositions, operational audit entries,
 * and security events per session. All other devtools data (profile attributes,
 * consent, feedback history) is read directly from the main stores.
 *
 * This module has no dependency on @aura/devtools — it only imports from
 * @aura/protocol to preserve the server↔devtools dependency direction.
 */

import type { AuraEvent, UIPrescription } from "@aura/protocol";

// ─── Record Types ─────────────────────────────────────────────────────────────
// These shapes match the DevtoolsState sub-schemas in @aura/devtools/src/schema.ts
// without importing from that package.

export interface DevtoolsPrescriptionEntry {
  id: string;
  surfaceId: string;
  mode: string;
  riskClass: string;
  manifestVersion: string;
  contextLock: { sequenceId: number; capturedAt: string };
  disposition: "accepted" | "rejected" | "dropped";
  dispositionTimestamp: string;
  adaptations: Array<{ type: string; target?: string }>;
  rejectionReason?: string;
  dropReason?: string;
  expiresAt?: string;
  elapsedMs?: number;
}

export interface DevtoolsOperationalAuditEntry {
  prescriptionId?: string;
  latencyClass?: string;
  decisionSource?: string;
  policyVersion?: string;
  manifestVersion?: string;
  dataClassesUsed?: string[];
  disposition?: "accepted" | "rejected" | "dropped";
  elapsedMs?: number;
  dropReason?: string;
}

export interface DevtoolsSecurityEntry {
  id: string;
  category: string;
  reason: string;
  timestamp: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IDevtoolsAccumulator {
  recordEvents(sessionId: string, events: AuraEvent[]): void;
  recordPrescriptionResult(
    sessionId: string,
    prescription: UIPrescription,
    disposition: "accepted" | "rejected" | "dropped",
    reason?: string,
    elapsedMs?: number,
  ): void;
  recordSecurityEvent(sessionId: string, entry: DevtoolsSecurityEntry): void;
  getEvents(sessionId: string): AuraEvent[];
  getPrescriptionEntries(sessionId: string): DevtoolsPrescriptionEntry[];
  getOperationalAudit(sessionId: string): DevtoolsOperationalAuditEntry[];
  getSecurityAudit(sessionId: string): DevtoolsSecurityEntry[];
}

// ─── In-Memory Implementation ─────────────────────────────────────────────────

export function createInMemoryDevtoolsAccumulator(): IDevtoolsAccumulator {
  const eventsMap = new Map<string, AuraEvent[]>();
  const prescriptionsMap = new Map<string, DevtoolsPrescriptionEntry[]>();
  const operationalAuditMap = new Map<string, DevtoolsOperationalAuditEntry[]>();
  const securityAuditMap = new Map<string, DevtoolsSecurityEntry[]>();

  function getOrCreate<T>(map: Map<string, T[]>, key: string): T[] {
    if (!map.has(key)) map.set(key, []);
    return map.get(key)!;
  }

  function summariseAdaptations(
    adaptations: UIPrescription["adaptations"],
  ): Array<{ type: string; target?: string }> {
    return adaptations.map((a) => ({
      type: a.type,
      target:
        "componentId" in a
          ? a.componentId
          : "target" in a
            ? (a.target as string)
            : undefined,
    }));
  }

  return {
    recordEvents(sessionId, events) {
      const list = getOrCreate(eventsMap, sessionId);
      for (const e of events) list.push(structuredClone(e));
    },

    recordPrescriptionResult(sessionId, prescription, disposition, reason, elapsedMs) {
      const timestamp = new Date().toISOString();

      const entry: DevtoolsPrescriptionEntry = {
        id: prescription.id,
        surfaceId: prescription.surfaceId,
        mode: prescription.mode,
        riskClass: "low", // v0: UIPrescription does not carry risk class
        manifestVersion: prescription.manifestVersion,
        contextLock: prescription.contextLock,
        disposition,
        dispositionTimestamp: timestamp,
        adaptations: summariseAdaptations(prescription.adaptations),
        expiresAt: prescription.constraints.expiresAt,
        elapsedMs,
        ...(disposition === "rejected" && reason ? { rejectionReason: reason } : {}),
        ...(disposition === "dropped" && reason ? { dropReason: reason } : {}),
      };
      getOrCreate(prescriptionsMap, sessionId).push(entry);

      const auditEntry: DevtoolsOperationalAuditEntry = {
        prescriptionId: prescription.id,
        latencyClass: prescription.latencyClass,
        decisionSource: prescription.audit.decisionSource,
        policyVersion: prescription.audit.policyVersion,
        manifestVersion: prescription.manifestVersion,
        dataClassesUsed: prescription.audit.dataClassesUsed,
        disposition,
        elapsedMs,
        ...(disposition === "dropped" && reason ? { dropReason: reason } : {}),
      };
      getOrCreate(operationalAuditMap, sessionId).push(auditEntry);
    },

    recordSecurityEvent(sessionId, entry) {
      getOrCreate(securityAuditMap, sessionId).push({ ...entry });
    },

    getEvents(sessionId) {
      return (eventsMap.get(sessionId) ?? []).map((e) => structuredClone(e));
    },

    getPrescriptionEntries(sessionId) {
      return (prescriptionsMap.get(sessionId) ?? []).map((p) => ({ ...p }));
    },

    getOperationalAudit(sessionId) {
      return (operationalAuditMap.get(sessionId) ?? []).map((e) => ({ ...e }));
    },

    getSecurityAudit(sessionId) {
      return (securityAuditMap.get(sessionId) ?? []).map((e) => ({ ...e }));
    },
  };
}
