/**
 * Consent Management for the AURA E-Commerce Demo.
 *
 * Provides framework-agnostic consent state management with independent
 * toggles for "behavior" (tracking) and "personalization". When
 * personalization consent is revoked, signals that all adaptations should
 * be reverted. Respects the ENABLE_CONSENT flag — when false, consent is
 * implicitly granted and controls should be hidden.
 *
 * This module exposes pure functions and a ConsentManager class that can
 * be wrapped by a React hook or context for UI integration.
 *
 * @see Requirements 9.4, 9.5, 11.5
 */

import type { ConsentState } from "@/lib/types/explanation";
import { flags } from "@/lib/config/flags";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Consent category identifier */
export type ConsentCategory = keyof ConsentState;

/**
 * Callback invoked when personalization consent is revoked.
 * The consumer should revert all adaptations within 500ms.
 */
export type RevocationCallback = () => void;

/**
 * Callback invoked whenever consent state changes.
 */
export type ConsentChangeCallback = (state: ConsentState) => void;

// ---------------------------------------------------------------------------
// Utility: Check if consent controls are enabled
// ---------------------------------------------------------------------------

/**
 * Returns whether consent controls should be displayed.
 * When ENABLE_CONSENT is false, consent is implicitly granted and
 * the controls should be hidden from the UI.
 *
 * @see Requirement 11.5
 */
export function isConsentEnabled(): boolean {
  return flags.ENABLE_CONSENT;
}

// ---------------------------------------------------------------------------
// ConsentManager
// ---------------------------------------------------------------------------

/**
 * Framework-agnostic consent manager.
 *
 * Tracks independent behavior/personalization consent toggles, fires
 * callbacks on state change, and triggers revocation logic when
 * personalization is revoked.
 */
export class ConsentManager {
  private state: ConsentState;
  private revocationCallbacks: Set<RevocationCallback> = new Set();
  private changeCallbacks: Set<ConsentChangeCallback> = new Set();

  /**
   * @param initialState - Optional initial consent state. Defaults to both consented (true).
   */
  constructor(initialState?: Partial<ConsentState>) {
    this.state = {
      behavior: initialState?.behavior ?? true,
      personalization: initialState?.personalization ?? true,
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns the current consent state.
   * If consent controls are disabled (ENABLE_CONSENT=false), returns
   * implicitly granted state (both true).
   */
  getConsentState(): ConsentState {
    if (!isConsentEnabled()) {
      return { behavior: true, personalization: true };
    }
    return { ...this.state };
  }

  /**
   * Sets a specific consent category to a given value.
   *
   * If personalization is being revoked (set to false), triggers all
   * registered revocation callbacks to signal adaptation revert.
   *
   * No-op when ENABLE_CONSENT is false (consent is implicit).
   *
   * @param category - The consent category to update
   * @param value - Whether consent is granted (true) or revoked (false)
   *
   * @see Requirements 9.4, 9.5
   */
  setConsent(category: ConsentCategory, value: boolean): void {
    if (!isConsentEnabled()) {
      return;
    }

    const previousValue = this.state[category];
    if (previousValue === value) {
      return; // No change
    }

    this.state[category] = value;

    // Trigger revocation callbacks when personalization is revoked
    if (category === "personalization" && value === false) {
      this.notifyRevocation();
    }

    this.notifyChange();
  }

  /**
   * Revokes all consent categories and triggers adaptation revert.
   *
   * No-op when ENABLE_CONSENT is false (consent is implicit).
   *
   * @see Requirement 9.5
   */
  revokeAll(): void {
    if (!isConsentEnabled()) {
      return;
    }

    const hadPersonalization = this.state.personalization;

    this.state.behavior = false;
    this.state.personalization = false;

    // Trigger revocation if personalization was previously granted
    if (hadPersonalization) {
      this.notifyRevocation();
    }

    this.notifyChange();
  }

  /**
   * Registers a callback to be invoked when personalization consent is revoked.
   * The callback should trigger reverting all adaptations within 500ms.
   *
   * @returns An unsubscribe function to remove the callback.
   */
  onRevocation(callback: RevocationCallback): () => void {
    this.revocationCallbacks.add(callback);
    return () => {
      this.revocationCallbacks.delete(callback);
    };
  }

  /**
   * Registers a callback to be invoked whenever consent state changes.
   *
   * @returns An unsubscribe function to remove the callback.
   */
  onChange(callback: ConsentChangeCallback): () => void {
    this.changeCallbacks.add(callback);
    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  /**
   * Resets consent state to both granted. Useful for testing and session resets.
   */
  reset(): void {
    this.state = { behavior: true, personalization: true };
    this.notifyChange();
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private notifyRevocation(): void {
    for (const cb of this.revocationCallbacks) {
      cb();
    }
  }

  private notifyChange(): void {
    const snapshot = this.getConsentState();
    for (const cb of this.changeCallbacks) {
      cb(snapshot);
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level Singleton
// ---------------------------------------------------------------------------

/**
 * Shared consent manager instance for the application.
 * React hooks and components should use this instance (or wrap it in context).
 */
export const consentManager = new ConsentManager();

// ---------------------------------------------------------------------------
// Convenience Functions (delegate to singleton)
// ---------------------------------------------------------------------------

/**
 * Returns the current consent state from the shared manager.
 */
export function getConsentState(): ConsentState {
  return consentManager.getConsentState();
}

/**
 * Sets a specific consent category on the shared manager.
 */
export function setConsent(category: ConsentCategory, value: boolean): void {
  consentManager.setConsent(category, value);
}

/**
 * Revokes all consent on the shared manager.
 */
export function revokeAll(): void {
  consentManager.revokeAll();
}
