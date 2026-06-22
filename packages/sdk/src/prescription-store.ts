/**
 * @aura/sdk — PrescriptionStore
 *
 * Per-surface prescription storage with admission validation,
 * expiry/staleness eviction, and listener dispatch.
 */

import { UIPrescriptionSchema } from "@aura/protocol";
import type { DataClass, UIPrescription } from "@aura/protocol";
import type { PrescriptionListener } from "./types.js";

/**
 * In-memory store for UI prescriptions, keyed by surfaceId.
 * Enforces one-prescription-per-surface (latest-wins) and validates
 * admission criteria before accepting a prescription.
 */
export class PrescriptionStore {
  /** One prescription per surfaceId (latest-wins). */
  private readonly prescriptions = new Map<string, UIPrescription>();

  /** Multiple listeners per surfaceId. */
  private readonly listeners = new Map<string, Set<PrescriptionListener>>();

  // ─── Storage ──────────────────────────────────────────────────────────────

  /**
   * Validates and stores a prescription. Returns true if stored, false if rejected.
   *
   * Admission criteria:
   * 1. Passes UIPrescriptionSchema validation
   * 2. constraints.expiresAt is a valid ISO timestamp in the future
   * 3. contextLock.sequenceId equals currentSeqId
   * 4. manifestVersion equals the provided manifestVersion parameter
   */
  store(prescription: UIPrescription, currentSeqId: number, manifestVersion: string): boolean {
    // 1. Schema validation
    const parseResult = UIPrescriptionSchema.safeParse(prescription);
    if (!parseResult.success) {
      return false;
    }

    // 2. Check expiresAt is in the future
    const expiresAt = new Date(prescription.constraints.expiresAt).getTime();
    if (isNaN(expiresAt) || expiresAt <= Date.now()) {
      return false;
    }

    // 3. Check contextLock.sequenceId matches current
    if (prescription.contextLock.sequenceId !== currentSeqId) {
      return false;
    }

    // 4. Check manifestVersion matches
    if (prescription.manifestVersion !== manifestVersion) {
      return false;
    }

    // All checks pass — store (latest-wins per surface)
    const surfaceId = prescription.surfaceId;
    this.prescriptions.set(surfaceId, prescription);

    // Notify listeners for this surface
    this.notifyListeners(surfaceId, prescription);

    return true;
  }

  /**
   * Returns the stored prescription for a surface, or undefined if:
   * - No prescription exists
   * - The stored prescription has expired (expiresAt <= now)
   * - The stored prescription's contextLock.sequenceId != currentSeqId
   */
  get(surfaceId: string, currentSeqId: number): UIPrescription | undefined {
    const prescription = this.prescriptions.get(surfaceId);
    if (!prescription) {
      return undefined;
    }

    // Check expiry
    const expiresAt = new Date(prescription.constraints.expiresAt).getTime();
    if (expiresAt <= Date.now()) {
      return undefined;
    }

    // Check context lock
    if (prescription.contextLock.sequenceId !== currentSeqId) {
      return undefined;
    }

    return prescription;
  }

  /**
   * Removes the prescription for a given surfaceId.
   */
  remove(surfaceId: string): void {
    this.prescriptions.delete(surfaceId);
  }

  /**
   * Finds a prescription by its id field, removes it,
   * and returns the surfaceId it was stored under (or undefined if not found).
   */
  removeByPrescriptionId(prescriptionId: string): string | undefined {
    for (const [surfaceId, prescription] of this.prescriptions) {
      if (prescription.id === prescriptionId) {
        this.prescriptions.delete(surfaceId);
        return surfaceId;
      }
    }
    return undefined;
  }

  /**
   * Removes all prescriptions whose audit.dataClassesUsed array includes
   * the specified dataClass. Returns the affected surfaceIds.
   */
  removeByDataClass(dataClass: string): string[] {
    const affected: string[] = [];

    for (const [surfaceId, prescription] of this.prescriptions) {
      const dataClasses = prescription.audit?.dataClassesUsed;
      if (dataClasses && dataClasses.includes(dataClass as DataClass)) {
        this.prescriptions.delete(surfaceId);
        affected.push(surfaceId);
      }
    }

    return affected;
  }

  /**
   * Evicts all prescriptions that are expired (expiresAt <= now) or
   * have a stale context lock (sequenceId != currentSeqId).
   * Returns the surfaceIds of evicted prescriptions.
   */
  evictExpiredAndStale(currentSeqId: number): string[] {
    const evicted: string[] = [];
    const now = Date.now();

    for (const [surfaceId, prescription] of this.prescriptions) {
      const expiresAt = new Date(prescription.constraints.expiresAt).getTime();
      const isExpired = expiresAt <= now;
      const isStale = prescription.contextLock.sequenceId !== currentSeqId;

      if (isExpired || isStale) {
        this.prescriptions.delete(surfaceId);
        evicted.push(surfaceId);
      }
    }

    return evicted;
  }

  /**
   * Removes all stored prescriptions.
   */
  clear(): void {
    this.prescriptions.clear();
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  /**
   * Registers a listener for prescription changes on a specific surface.
   * Returns an unsubscribe function that removes the listener.
   * Multiple listeners per surface are supported.
   */
  subscribe(surfaceId: string, listener: PrescriptionListener): () => void {
    let surfaceListeners = this.listeners.get(surfaceId);
    if (!surfaceListeners) {
      surfaceListeners = new Set();
      this.listeners.set(surfaceId, surfaceListeners);
    }

    surfaceListeners.add(listener);

    // Return unsubscribe function
    return () => {
      surfaceListeners!.delete(listener);
      // Clean up empty sets
      if (surfaceListeners!.size === 0) {
        this.listeners.delete(surfaceId);
      }
    };
  }

  /**
   * Notifies all registered listeners for a surface with the given prescription
   * (or undefined when a prescription is removed/expired).
   */
  notifyListeners(surfaceId: string, prescription: UIPrescription | undefined): void {
    const surfaceListeners = this.listeners.get(surfaceId);
    if (!surfaceListeners) {
      return;
    }

    for (const listener of surfaceListeners) {
      listener(prescription);
    }
  }

  /**
   * Removes ALL listeners for all surfaces.
   */
  clearListeners(): void {
    this.listeners.clear();
  }
}
