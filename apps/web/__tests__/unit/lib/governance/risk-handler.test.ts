/**
 * Unit tests for the risk-class governance handler.
 * Validates governance behavior for low, medium, and high risk prescriptions.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getGovernanceInstruction,
  createGovernanceSession,
  createAuditEntry,
  getAuditLog,
  clearAuditLog,
  shouldApplyAdaptation,
} from "@/lib/governance/risk-handler";

describe("getGovernanceInstruction", () => {
  describe("low risk", () => {
    it("returns auto-apply with inline explanation and undo", () => {
      const instruction = getGovernanceInstruction("low");
      expect(instruction.riskClass).toBe("low");
      expect(instruction.uiType).toBe("inline-explanation");
      expect(instruction.autoApply).toBe(true);
      expect(instruction.showUndo).toBe(true);
      expect(instruction.timeoutMs).toBeNull();
      expect(instruction.timeoutAction).toBeNull();
      expect(instruction.requiresAudit).toBe(false);
    });
  });

  describe("medium risk", () => {
    it("returns dismissible overlay with 10s timeout", () => {
      const instruction = getGovernanceInstruction("medium");
      expect(instruction.riskClass).toBe("medium");
      expect(instruction.uiType).toBe("dismissible-overlay");
      expect(instruction.autoApply).toBe(false);
      expect(instruction.showUndo).toBe(true);
      expect(instruction.timeoutMs).toBe(10_000);
      expect(instruction.timeoutAction).toBe("apply");
      expect(instruction.requiresAudit).toBe(false);
    });
  });

  describe("high risk", () => {
    it("returns confirmation dialog with 30s timeout and audit", () => {
      const instruction = getGovernanceInstruction("high");
      expect(instruction.riskClass).toBe("high");
      expect(instruction.uiType).toBe("confirmation-dialog");
      expect(instruction.autoApply).toBe(false);
      expect(instruction.showUndo).toBe(true);
      expect(instruction.timeoutMs).toBe(30_000);
      expect(instruction.timeoutAction).toBe("dismiss");
      expect(instruction.requiresAudit).toBe(true);
    });
  });
});

describe("createGovernanceSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAuditLog();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("low risk sessions", () => {
    it("does not set a timeout", () => {
      const onDecision = vi.fn();
      createGovernanceSession("rx-001", "search.results", "low", onDecision);

      vi.advanceTimersByTime(60_000);
      expect(onDecision).not.toHaveBeenCalled();
    });

    it("can be resolved manually", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-001",
        "search.results",
        "low",
        onDecision
      );

      session.resolve("accepted");
      expect(onDecision).toHaveBeenCalledWith("accepted");
    });

    it("does not log audit entry", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-001",
        "search.results",
        "low",
        onDecision
      );

      session.resolve("accepted");
      expect(getAuditLog()).toHaveLength(0);
    });
  });

  describe("medium risk sessions", () => {
    it("auto-applies after 10 seconds of inactivity", () => {
      const onDecision = vi.fn();
      createGovernanceSession("rx-002", "filter.panel", "medium", onDecision);

      vi.advanceTimersByTime(9_999);
      expect(onDecision).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onDecision).toHaveBeenCalledWith("accepted");
    });

    it("can be resolved before timeout (dismiss)", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-002",
        "filter.panel",
        "medium",
        onDecision
      );

      session.resolve("accepted");
      expect(onDecision).toHaveBeenCalledWith("accepted");

      // Timeout should be cancelled, no second call
      vi.advanceTimersByTime(15_000);
      expect(onDecision).toHaveBeenCalledTimes(1);
    });

    it("cancelTimeout prevents auto-apply", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-002",
        "filter.panel",
        "medium",
        onDecision
      );

      session.cancelTimeout();
      vi.advanceTimersByTime(15_000);
      expect(onDecision).not.toHaveBeenCalled();
    });

    it("does not log audit entry", () => {
      const onDecision = vi.fn();
      createGovernanceSession("rx-002", "filter.panel", "medium", onDecision);

      vi.advanceTimersByTime(10_000);
      expect(getAuditLog()).toHaveLength(0);
    });
  });

  describe("high risk sessions", () => {
    it("dismisses without applying after 30 seconds", () => {
      const onDecision = vi.fn();
      createGovernanceSession("rx-003", "search.results", "high", onDecision);

      vi.advanceTimersByTime(29_999);
      expect(onDecision).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onDecision).toHaveBeenCalledWith("timeout");
    });

    it("logs audit entry on timeout", () => {
      const onDecision = vi.fn();
      createGovernanceSession("rx-003", "search.results", "high", onDecision);

      vi.advanceTimersByTime(30_000);

      const log = getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].prescriptionId).toBe("rx-003");
      expect(log[0].surfaceId).toBe("search.results");
      expect(log[0].riskClass).toBe("high");
      expect(log[0].decision).toBe("timeout");
      expect(log[0].timestamp).toBeDefined();
    });

    it("logs audit entry on explicit accept", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-003",
        "search.results",
        "high",
        onDecision
      );

      session.resolve("accepted");

      const log = getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].decision).toBe("accepted");
    });

    it("logs audit entry on explicit reject", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-003",
        "search.results",
        "high",
        onDecision
      );

      session.resolve("rejected");

      const log = getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].decision).toBe("rejected");
    });

    it("resolve is idempotent (second call is ignored)", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-003",
        "search.results",
        "high",
        onDecision
      );

      session.resolve("accepted");
      session.resolve("rejected");

      expect(onDecision).toHaveBeenCalledTimes(1);
      expect(onDecision).toHaveBeenCalledWith("accepted");
      expect(getAuditLog()).toHaveLength(1);
    });

    it("cancels timeout when resolved before 30s", () => {
      const onDecision = vi.fn();
      const session = createGovernanceSession(
        "rx-003",
        "search.results",
        "high",
        onDecision
      );

      session.resolve("accepted");
      vi.advanceTimersByTime(35_000);
      expect(onDecision).toHaveBeenCalledTimes(1);
    });
  });
});

describe("createAuditEntry", () => {
  beforeEach(() => {
    clearAuditLog();
  });

  it("creates an entry with all required fields", () => {
    const entry = createAuditEntry("rx-100", "filter.panel", "high", "accepted");
    expect(entry.prescriptionId).toBe("rx-100");
    expect(entry.surfaceId).toBe("filter.panel");
    expect(entry.riskClass).toBe("high");
    expect(entry.decision).toBe("accepted");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("appends to the audit log", () => {
    createAuditEntry("rx-100", "filter.panel", "high", "accepted");
    createAuditEntry("rx-101", "search.results", "high", "rejected");
    expect(getAuditLog()).toHaveLength(2);
  });
});

describe("shouldApplyAdaptation", () => {
  it("low risk: always true regardless of decision", () => {
    expect(shouldApplyAdaptation("low", "accepted")).toBe(true);
    expect(shouldApplyAdaptation("low", "rejected")).toBe(true);
    expect(shouldApplyAdaptation("low", "timeout")).toBe(true);
  });

  it("medium risk: true on accepted, false otherwise", () => {
    expect(shouldApplyAdaptation("medium", "accepted")).toBe(true);
    expect(shouldApplyAdaptation("medium", "rejected")).toBe(false);
    expect(shouldApplyAdaptation("medium", "timeout")).toBe(false);
  });

  it("high risk: true only on accepted", () => {
    expect(shouldApplyAdaptation("high", "accepted")).toBe(true);
    expect(shouldApplyAdaptation("high", "rejected")).toBe(false);
    expect(shouldApplyAdaptation("high", "timeout")).toBe(false);
  });
});

describe("clearAuditLog", () => {
  beforeEach(() => {
    clearAuditLog();
  });

  it("removes all entries from the audit log", () => {
    createAuditEntry("rx-100", "filter.panel", "high", "accepted");
    createAuditEntry("rx-101", "search.results", "high", "timeout");
    expect(getAuditLog()).toHaveLength(2);

    clearAuditLog();
    expect(getAuditLog()).toHaveLength(0);
  });
});
