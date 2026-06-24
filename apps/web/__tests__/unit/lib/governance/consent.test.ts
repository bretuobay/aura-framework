/**
 * Unit tests for the consent management module.
 * Validates independent behavior/personalization toggles, revocation callbacks,
 * ENABLE_CONSENT flag behavior, and adaptation revert signaling.
 *
 * @see Requirements 9.4, 9.5, 11.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ConsentManager,
  isConsentEnabled,
  getConsentState,
  setConsent,
  revokeAll,
  consentManager,
} from "@/lib/governance/consent";

// Mock the flags module so we can control ENABLE_CONSENT
vi.mock("@/lib/config/flags", () => ({
  flags: {
    ENABLE_CONSENT: true,
    USE_REAL_LLM: false,
    USE_REAL_SLM: false,
    SIMULATE_ADAPTATIONS: false,
    SHOW_DEVTOOLS: false,
    ENABLE_EXPLANATIONS: true,
  },
}));

// Import after mock so we can modify it
import { flags } from "@/lib/config/flags";

describe("ConsentManager", () => {
  let manager: ConsentManager;

  beforeEach(() => {
    // Ensure ENABLE_CONSENT is true for most tests
    (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = true;
    manager = new ConsentManager();
  });

  describe("initialization", () => {
    it("defaults to both behavior and personalization consented", () => {
      const state = manager.getConsentState();
      expect(state.behavior).toBe(true);
      expect(state.personalization).toBe(true);
    });

    it("accepts custom initial state", () => {
      const custom = new ConsentManager({ behavior: false, personalization: true });
      const state = custom.getConsentState();
      expect(state.behavior).toBe(false);
      expect(state.personalization).toBe(true);
    });

    it("uses defaults for unspecified categories in partial initial state", () => {
      const custom = new ConsentManager({ behavior: false });
      const state = custom.getConsentState();
      expect(state.behavior).toBe(false);
      expect(state.personalization).toBe(true);
    });
  });

  describe("getConsentState", () => {
    it("returns a copy of the current state (not a reference)", () => {
      const state = manager.getConsentState();
      state.behavior = false;
      expect(manager.getConsentState().behavior).toBe(true);
    });

    it("returns implicitly granted state when ENABLE_CONSENT is false", () => {
      (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = false;
      const custom = new ConsentManager({ behavior: false, personalization: false });
      const state = custom.getConsentState();
      expect(state.behavior).toBe(true);
      expect(state.personalization).toBe(true);
    });
  });

  describe("setConsent", () => {
    it("sets behavior consent independently", () => {
      manager.setConsent("behavior", false);
      const state = manager.getConsentState();
      expect(state.behavior).toBe(false);
      expect(state.personalization).toBe(true);
    });

    it("sets personalization consent independently", () => {
      manager.setConsent("personalization", false);
      const state = manager.getConsentState();
      expect(state.behavior).toBe(true);
      expect(state.personalization).toBe(false);
    });

    it("is a no-op when ENABLE_CONSENT is false", () => {
      (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = false;
      manager.setConsent("behavior", false);
      // Re-enable to read actual state
      (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = true;
      expect(manager.getConsentState().behavior).toBe(true);
    });

    it("does not fire callbacks when value does not change", () => {
      const onChange = vi.fn();
      manager.onChange(onChange);
      manager.setConsent("behavior", true); // Already true
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("revocation callbacks", () => {
    it("fires revocation callback when personalization is revoked", () => {
      const onRevoke = vi.fn();
      manager.onRevocation(onRevoke);
      manager.setConsent("personalization", false);
      expect(onRevoke).toHaveBeenCalledTimes(1);
    });

    it("does not fire revocation callback when behavior is revoked", () => {
      const onRevoke = vi.fn();
      manager.onRevocation(onRevoke);
      manager.setConsent("behavior", false);
      expect(onRevoke).not.toHaveBeenCalled();
    });

    it("does not fire revocation callback when personalization is granted", () => {
      const custom = new ConsentManager({ personalization: false });
      const onRevoke = vi.fn();
      custom.onRevocation(onRevoke);
      custom.setConsent("personalization", true);
      expect(onRevoke).not.toHaveBeenCalled();
    });

    it("supports multiple revocation callbacks", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      manager.onRevocation(cb1);
      manager.onRevocation(cb2);
      manager.setConsent("personalization", false);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it("unsubscribes revocation callback correctly", () => {
      const onRevoke = vi.fn();
      const unsubscribe = manager.onRevocation(onRevoke);
      unsubscribe();
      manager.setConsent("personalization", false);
      expect(onRevoke).not.toHaveBeenCalled();
    });
  });

  describe("onChange callbacks", () => {
    it("fires change callback on consent state change", () => {
      const onChange = vi.fn();
      manager.onChange(onChange);
      manager.setConsent("behavior", false);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ behavior: false, personalization: true });
    });

    it("fires change callback on revokeAll", () => {
      const onChange = vi.fn();
      manager.onChange(onChange);
      manager.revokeAll();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ behavior: false, personalization: false });
    });

    it("unsubscribes change callback correctly", () => {
      const onChange = vi.fn();
      const unsubscribe = manager.onChange(onChange);
      unsubscribe();
      manager.setConsent("behavior", false);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("revokeAll", () => {
    it("revokes both behavior and personalization", () => {
      manager.revokeAll();
      const state = manager.getConsentState();
      expect(state.behavior).toBe(false);
      expect(state.personalization).toBe(false);
    });

    it("fires revocation callback when personalization was granted", () => {
      const onRevoke = vi.fn();
      manager.onRevocation(onRevoke);
      manager.revokeAll();
      expect(onRevoke).toHaveBeenCalledTimes(1);
    });

    it("does not fire revocation callback when personalization was already revoked", () => {
      manager.setConsent("personalization", false);
      const onRevoke = vi.fn();
      manager.onRevocation(onRevoke);
      manager.revokeAll();
      expect(onRevoke).not.toHaveBeenCalled();
    });

    it("is a no-op when ENABLE_CONSENT is false", () => {
      (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = false;
      const onRevoke = vi.fn();
      manager.onRevocation(onRevoke);
      manager.revokeAll();
      expect(onRevoke).not.toHaveBeenCalled();
      // Re-enable to check state is unchanged
      (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = true;
      expect(manager.getConsentState().behavior).toBe(true);
      expect(manager.getConsentState().personalization).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets consent state to both granted", () => {
      manager.revokeAll();
      manager.reset();
      const state = manager.getConsentState();
      expect(state.behavior).toBe(true);
      expect(state.personalization).toBe(true);
    });

    it("fires change callback on reset", () => {
      manager.revokeAll();
      const onChange = vi.fn();
      manager.onChange(onChange);
      manager.reset();
      expect(onChange).toHaveBeenCalledWith({ behavior: true, personalization: true });
    });
  });
});

describe("isConsentEnabled", () => {
  afterEach(() => {
    (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = true;
  });

  it("returns true when ENABLE_CONSENT flag is true", () => {
    (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = true;
    expect(isConsentEnabled()).toBe(true);
  });

  it("returns false when ENABLE_CONSENT flag is false", () => {
    (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = false;
    expect(isConsentEnabled()).toBe(false);
  });
});

describe("module-level convenience functions", () => {
  beforeEach(() => {
    (flags as { ENABLE_CONSENT: boolean }).ENABLE_CONSENT = true;
    consentManager.reset();
  });

  it("getConsentState returns current state from singleton", () => {
    const state = getConsentState();
    expect(state.behavior).toBe(true);
    expect(state.personalization).toBe(true);
  });

  it("setConsent updates the singleton state", () => {
    setConsent("behavior", false);
    expect(getConsentState().behavior).toBe(false);
  });

  it("revokeAll revokes all consent on the singleton", () => {
    revokeAll();
    const state = getConsentState();
    expect(state.behavior).toBe(false);
    expect(state.personalization).toBe(false);
  });
});
