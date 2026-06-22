/**
 * @aura/sdk — Public API
 *
 * This module is the single entry-point for consumers of the SDK.
 * Only types and functions intended for external use are exported here.
 */

// ─── Factory ─────────────────────────────────────────────────────────────────
export { createAuraClient } from "./client.js";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  AuraClient,
  AuraClientConfig,
  AuraClientOptions,
  PrescriptionListener,
  AuraLogEntry,
} from "./types.js";

// ─── Errors ──────────────────────────────────────────────────────────────────
export {
  AuraConfigError,
  AuraValidationError,
  AuraClientError,
  ErrorCodes,
  type ErrorCode,
} from "./errors.js";
