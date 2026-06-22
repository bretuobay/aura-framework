import type { ZodIssue } from "zod";

/**
 * Error codes for all SDK runtime errors.
 * Used as the `code` property on `AuraClientError` instances.
 */
export const ErrorCodes = {
  SESSION_INIT_FAILED: "SESSION_INIT_FAILED",
  SESSION_UNREACHABLE: "SESSION_UNREACHABLE",
  SSE_CONNECTION_LOST: "SSE_CONNECTION_LOST",
  SSE_RECONNECT_FAILED: "SSE_RECONNECT_FAILED",
  STALE_CONTEXT_LOCK: "STALE_CONTEXT_LOCK",
  MANIFEST_VERSION_MISMATCH: "MANIFEST_VERSION_MISMATCH",
  PRESCRIPTION_EXPIRED: "PRESCRIPTION_EXPIRED",
  PRESCRIPTION_INVALID: "PRESCRIPTION_INVALID",
  REQUEST_FAILED: "REQUEST_FAILED",
  RESPONSE_INVALID: "RESPONSE_INVALID",
  EVENT_QUEUE_OVERFLOW: "EVENT_QUEUE_OVERFLOW",
  EVENT_TTL_EXPIRED: "EVENT_TTL_EXPIRED",
} as const;

/** Union type of all valid error code strings. */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Thrown synchronously from `createAuraClient` when configuration is invalid.
 */
export class AuraConfigError extends Error {
  override readonly name = "AuraConfigError";

  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, AuraConfigError.prototype);
  }
}

/**
 * Rejected from async methods when user-provided data fails schema validation.
 */
export class AuraValidationError extends Error {
  override readonly name = "AuraValidationError";

  constructor(
    message: string,
    public readonly issues: ZodIssue[],
  ) {
    super(message);
    Object.setPrototypeOf(this, AuraValidationError.prototype);
  }
}

/**
 * Delivered to `onError` handlers for runtime errors (network failures, SSE drops, etc.).
 */
export class AuraClientError extends Error {
  override readonly name = "AuraClientError";

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context: Record<string, unknown>,
  ) {
    super(message);
    Object.setPrototypeOf(this, AuraClientError.prototype);
  }
}
