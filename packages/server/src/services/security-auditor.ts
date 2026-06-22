/**
 * SecurityAuditor service for @aura/server.
 *
 * Records structured security audit events for adversarial-hardening observability.
 * Provides prompt-injection scanning, replay detection, and correction eligibility checks.
 */

import type { AuraEvent } from "@aura/protocol";
import type { SecurityPolicyConfig } from "../types/config.types.js";

/**
 * Result of scanning events for prompt injection indicators.
 */
export interface SecurityScanResult {
  /** Whether all events are clean (no injection indicators found) */
  clean: boolean;
  /** Indices of events that matched injection patterns */
  flaggedIndices: number[];
  /** Descriptions of which patterns matched */
  indicators: string[];
}

/**
 * A structured security audit record for observability.
 */
export interface SecurityAuditRecord {
  timestamp: string;
  sessionId: string;
  type:
    | "prompt-injection"
    | "replay-detected"
    | "correction-denied"
    | "policy-violation"
    | "rate-limit"
    | "model-output-rejected";
  detail: string;
  severity: "info" | "warn" | "critical";
}

/**
 * Interface for the security auditor service.
 */
export interface ISecurityAuditor {
  /** Check events for prompt injection indicators */
  scanForInjection(events: AuraEvent[], sessionId: string): SecurityScanResult;

  /** Detect replay attacks (duplicate event batches) */
  detectReplay(
    sessionId: string,
    eventIds: string[],
    timestamps: string[]
  ): boolean;

  /** Validate profile correction eligibility */
  isCorrectionEligible(
    attributeId: string,
    policy: SecurityPolicyConfig
  ): boolean;

  /** Record a security audit event */
  record(entry: SecurityAuditRecord): void;

  /** Get all recorded audit entries (for observability/devtools) */
  getRecords(): SecurityAuditRecord[];
}

/**
 * Default prompt injection patterns that detect common injection attempts.
 */
const DEFAULT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|above)\s+instructions/i,
  /system\s*:\s*/i,
  /<\|.*?\|>/,
  /\bdo\s+not\s+follow\b/i,
  /\byou\s+are\s+now\b/i,
  /\bforget\s+(all|everything|your)\b/i,
  /\boverride\s+(all|previous|system)\b/i,
];

/**
 * Factory function to create a SecurityAuditor instance.
 *
 * @param config.injectionPatterns - Custom regex patterns for prompt injection detection
 * @param config.replayWindowMs - Sliding window for replay detection (default: 5000ms)
 * @param config.protectedAttributes - Attribute IDs that cannot be corrected by users
 */
export function createSecurityAuditor(config: {
  injectionPatterns?: RegExp[];
  replayWindowMs?: number;
  protectedAttributes?: string[];
}): ISecurityAuditor {
  const injectionPatterns = config.injectionPatterns ?? DEFAULT_INJECTION_PATTERNS;
  const replayWindowMs = config.replayWindowMs ?? 5000;
  const protectedAttributes = new Set(config.protectedAttributes ?? []);

  // Internal storage for audit records
  const auditRecords: SecurityAuditRecord[] = [];

  // Replay detection: Map of fingerprint -> timestamp (ms) for sliding window
  const replayFingerprints = new Map<string, number>();

  /**
   * Compute a fingerprint for a batch of event IDs and timestamps.
   * Uses a simple string concatenation approach for deterministic hashing.
   */
  function computeFingerprint(
    sessionId: string,
    eventIds: string[],
    timestamps: string[]
  ): string {
    return `${sessionId}:${eventIds.join(",")}:${timestamps.join(",")}`;
  }

  /**
   * Evict stale entries from the replay fingerprint map.
   */
  function evictStaleFingerprints(now: number): void {
    for (const [key, timestamp] of replayFingerprints) {
      if (now - timestamp > replayWindowMs) {
        replayFingerprints.delete(key);
      }
    }
  }

  /**
   * Stringify all values of an event's payload for pattern matching.
   */
  function stringifyPayload(payload: Record<string, unknown>): string {
    return Object.values(payload)
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join(" ");
  }

  return {
    scanForInjection(
      events: AuraEvent[],
      _sessionId: string
    ): SecurityScanResult {
      const flaggedIndices: number[] = [];
      const indicators: string[] = [];

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const text = stringifyPayload(event.payload);

        for (const pattern of injectionPatterns) {
          if (pattern.test(text)) {
            if (!flaggedIndices.includes(i)) {
              flaggedIndices.push(i);
            }
            indicators.push(
              `Event[${i}] matched injection pattern: ${pattern.source}`
            );
          }
        }
      }

      return {
        clean: flaggedIndices.length === 0,
        flaggedIndices,
        indicators,
      };
    },

    detectReplay(
      sessionId: string,
      eventIds: string[],
      timestamps: string[]
    ): boolean {
      const now = Date.now();

      // Evict entries older than the replay window
      evictStaleFingerprints(now);

      const fingerprint = computeFingerprint(sessionId, eventIds, timestamps);

      if (replayFingerprints.has(fingerprint)) {
        // This exact batch was seen within the window — replay detected
        return true;
      }

      // Record this fingerprint with current timestamp
      replayFingerprints.set(fingerprint, now);
      return false;
    },

    isCorrectionEligible(
      attributeId: string,
      policy: SecurityPolicyConfig
    ): boolean {
      // Check against the configured protected attributes from the policy
      const policyProtected = new Set(policy.protectedAttributes ?? []);

      // If the attribute is in either the constructor-level or policy-level protected list,
      // correction is denied
      if (protectedAttributes.has(attributeId) || policyProtected.has(attributeId)) {
        return false;
      }

      return true;
    },

    record(entry: SecurityAuditRecord): void {
      auditRecords.push(entry);
    },

    getRecords(): SecurityAuditRecord[] {
      return [...auditRecords];
    },
  };
}
