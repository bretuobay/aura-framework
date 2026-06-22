import type { UIPrescription } from "./prescription.js";

/**
 * Returns `true` if the prescription is expired relative to `now`.
 *
 * - Returns `true` if `expiresAt` is before `now`
 * - Returns `true` if `expiresAt` is missing or invalid (fail-safe: treat as expired)
 * - Never throws regardless of input
 * - Monotone: once expired at time d1, stays expired for all d2 > d1
 */
export function isPrescriptionExpired(
  prescription: UIPrescription,
  now: Date
): boolean {
  try {
    const expiresAt = (prescription as any)?.constraints?.expiresAt;
    if (typeof expiresAt !== "string" || expiresAt.length === 0) {
      return true;
    }

    const expiryTime = Date.parse(expiresAt);
    if (Number.isNaN(expiryTime)) {
      return true;
    }

    return now.getTime() > expiryTime;
  } catch {
    return true;
  }
}

/**
 * Returns `true` if the prescription's context lock is stale relative to the
 * current context sequence ID.
 *
 * - Returns `true` if `contextLock.sequenceId ≠ currentContextSequenceId`
 * - Returns `true` if `currentContextSequenceId` is negative or not an integer
 * - Never throws regardless of input
 */
export function isPrescriptionContextStale(
  prescription: UIPrescription,
  currentContextSequenceId: number
): boolean {
  try {
    if (
      typeof currentContextSequenceId !== "number" ||
      !Number.isFinite(currentContextSequenceId) ||
      !Number.isInteger(currentContextSequenceId) ||
      currentContextSequenceId < 0
    ) {
      return true;
    }

    const lockSequenceId = (prescription as any)?.contextLock?.sequenceId;
    if (
      typeof lockSequenceId !== "number" ||
      !Number.isFinite(lockSequenceId) ||
      !Number.isInteger(lockSequenceId) ||
      lockSequenceId < 0
    ) {
      return true;
    }

    return lockSequenceId !== currentContextSequenceId;
  } catch {
    return true;
  }
}
