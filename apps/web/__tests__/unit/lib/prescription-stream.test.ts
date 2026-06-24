/**
 * Unit tests for the client-side SSE prescription stream manager.
 *
 * Tests cover:
 * - Connection lifecycle (connect, disconnect)
 * - Prescription message handling
 * - Reconnection with exponential backoff
 * - Status transitions
 * - Error handling for malformed messages
 *
 * @see Requirements 6.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PrescriptionStream,
  createPrescriptionStream,
  computeBackoffDelay,
  type ConnectionStatus,
  type PrescriptionStreamError,
} from "@/lib/sse/prescription-stream";
import type { UIPrescription } from "@aura/protocol";

// ─── Mock EventSource ────────────────────────────────────────────────────────

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  readyState: number = 0; // CONNECTING
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  private listeners: Record<string, Array<(event: MessageEvent) => void>> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate async open
    setTimeout(() => {
      this.readyState = 1; // OPEN
    }, 0);
  }

  addEventListener(event: string, handler: (event: MessageEvent) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: (event: MessageEvent) => void): void {
    const handlers = this.listeners[event];
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  }

  close(): void {
    this.readyState = 2; // CLOSED
  }

  // ─── Test Helpers ────────────────────────────────────────────────────────

  /** Simulate the server sending a named SSE event */
  simulateEvent(eventName: string, data: string, lastEventId?: string): void {
    const event = new MessageEvent(eventName, {
      data,
      lastEventId: lastEventId ?? "",
    });
    const handlers = this.listeners[eventName];
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
  }

  /** Simulate a generic (unnamed) message */
  simulateMessage(data: string, lastEventId?: string): void {
    const event = new MessageEvent("message", {
      data,
      lastEventId: lastEventId ?? "",
    });
    if (this.onmessage) {
      this.onmessage(event);
    }
  }

  /** Simulate an error event */
  simulateError(): void {
    if (this.onerror) {
      this.onerror();
    }
  }
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("computeBackoffDelay", () => {
  it("returns 1s for first attempt", () => {
    expect(computeBackoffDelay(1)).toBe(1000);
  });

  it("returns 2s for second attempt", () => {
    expect(computeBackoffDelay(2)).toBe(2000);
  });

  it("returns 4s for third attempt", () => {
    expect(computeBackoffDelay(3)).toBe(4000);
  });

  it("caps at maxBackoffMs", () => {
    expect(computeBackoffDelay(10, 30000)).toBe(30000);
  });

  it("respects custom maxBackoffMs", () => {
    expect(computeBackoffDelay(5, 5000)).toBe(5000);
  });
});

describe("PrescriptionStream", () => {
  const mockPrescription: UIPrescription = {
    id: "rx_001",
    surfaceId: "search.results",
    mode: "autoApply",
    latencyClass: "fast",
    contextLock: {
      sequenceId: 1,
      capturedAt: "2024-01-01T00:00:00.000Z",
    },
    adaptations: [
      {
        type: "componentVariant",
        slotId: "slot-1",
        componentId: "product-card",
        variant: "compact",
        reasonCode: "travel-intent",
      },
    ],
    constraints: {
      expiresAt: "2024-12-31T23:59:59.000Z",
    },
    manifestVersion: "1.0.0",
    audit: {},
  };

  describe("connect()", () => {
    it("creates an EventSource with the correct URL", () => {
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
      });

      stream.connect();

      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.instances[0].url).toBe(
        "/api/aura/prescriptions/stream?sessionId=sess_123",
      );
    });

    it("uses baseUrl when provided", () => {
      const stream = createPrescriptionStream({
        baseUrl: "https://api.example.com",
        sessionId: "sess_456",
        onPrescription: vi.fn(),
      });

      stream.connect();

      expect(MockEventSource.instances[0].url).toBe(
        "https://api.example.com/api/aura/prescriptions/stream?sessionId=sess_456",
      );
    });

    it("transitions to 'connecting' status on connect", () => {
      const onStatusChange = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
        onStatusChange,
      });

      stream.connect();

      expect(onStatusChange).toHaveBeenCalledWith("connecting");
      expect(stream.getStatus()).toBe("connecting");
    });

    it("transitions to 'connected' when server sends 'connected' event", () => {
      const onStatusChange = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
        onStatusChange,
      });

      stream.connect();
      const es = MockEventSource.instances[0];
      es.simulateEvent("connected", JSON.stringify({ sessionId: "sess_123" }));

      expect(stream.getStatus()).toBe("connected");
      expect(stream.isConnected()).toBe(true);
    });

    it("does nothing if explicitly disconnected", () => {
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
      });

      stream.connect();
      stream.disconnect();

      // Clear instances
      MockEventSource.instances = [];

      stream.connect();
      expect(MockEventSource.instances).toHaveLength(0);
    });
  });

  describe("prescription delivery", () => {
    it("delivers prescriptions via named 'prescription' event", () => {
      const onPrescription = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription,
      });

      stream.connect();
      const es = MockEventSource.instances[0];
      es.simulateEvent("connected", JSON.stringify({ sessionId: "sess_123" }));
      es.simulateEvent("prescription", JSON.stringify(mockPrescription), "rx_001");

      expect(onPrescription).toHaveBeenCalledTimes(1);
      expect(onPrescription).toHaveBeenCalledWith(mockPrescription);
    });

    it("delivers prescriptions via generic onmessage fallback", () => {
      const onPrescription = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription,
      });

      stream.connect();
      const es = MockEventSource.instances[0];
      es.simulateMessage(JSON.stringify(mockPrescription));

      expect(onPrescription).toHaveBeenCalledTimes(1);
      expect(onPrescription).toHaveBeenCalledWith(mockPrescription);
    });

    it("reports parse errors for invalid JSON", () => {
      const onError = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
        onError,
      });

      stream.connect();
      const es = MockEventSource.instances[0];
      es.simulateEvent("prescription", "not valid json{{{");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "PARSE_ERROR",
          message: expect.stringContaining("parse"),
        }),
      );
    });
  });

  describe("disconnect()", () => {
    it("closes the EventSource and transitions to disconnected", () => {
      const onStatusChange = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
        onStatusChange,
      });

      stream.connect();
      const es = MockEventSource.instances[0];
      stream.disconnect();

      expect(es.readyState).toBe(2); // CLOSED
      expect(stream.getStatus()).toBe("disconnected");
      expect(stream.isConnected()).toBe(false);
    });

    it("cancels pending reconnection timers", () => {
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
      });

      stream.connect();
      const es = MockEventSource.instances[0];

      // Simulate connection established then error
      es.simulateEvent("connected", JSON.stringify({ sessionId: "sess_123" }));
      es.simulateError();

      // Should be in reconnecting state
      expect(stream.getStatus()).toBe("reconnecting");

      // Disconnect should cancel the timer
      stream.disconnect();
      expect(stream.getStatus()).toBe("disconnected");

      // Advance time — no new EventSource should be created
      vi.advanceTimersByTime(60_000);
      expect(MockEventSource.instances).toHaveLength(1);
    });
  });

  describe("reconnection", () => {
    it("attempts reconnection on connection error", () => {
      const onStatusChange = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
        onStatusChange,
      });

      stream.connect();
      const es = MockEventSource.instances[0];
      es.simulateEvent("connected", JSON.stringify({ sessionId: "sess_123" }));
      es.simulateError();

      expect(stream.getStatus()).toBe("reconnecting");

      // Advance past first backoff (1s)
      vi.advanceTimersByTime(1000);

      // A new EventSource should have been created
      expect(MockEventSource.instances).toHaveLength(2);
    });

    it("uses exponential backoff for successive reconnection attempts", () => {
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
      });

      stream.connect();

      // First error → 1s backoff
      MockEventSource.instances[0].simulateEvent(
        "connected",
        JSON.stringify({ sessionId: "sess_123" }),
      );
      MockEventSource.instances[0].simulateError();
      vi.advanceTimersByTime(999);
      expect(MockEventSource.instances).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(MockEventSource.instances).toHaveLength(2);

      // Second error → 2s backoff
      MockEventSource.instances[1].simulateError();
      vi.advanceTimersByTime(1999);
      expect(MockEventSource.instances).toHaveLength(2);
      vi.advanceTimersByTime(1);
      expect(MockEventSource.instances).toHaveLength(3);

      // Third error → 4s backoff
      MockEventSource.instances[2].simulateError();
      vi.advanceTimersByTime(3999);
      expect(MockEventSource.instances).toHaveLength(3);
      vi.advanceTimersByTime(1);
      expect(MockEventSource.instances).toHaveLength(4);
    });

    it("resets backoff counter on successful reconnection", () => {
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
      });

      stream.connect();
      MockEventSource.instances[0].simulateEvent(
        "connected",
        JSON.stringify({ sessionId: "sess_123" }),
      );
      MockEventSource.instances[0].simulateError();

      // Reconnect after 1s
      vi.advanceTimersByTime(1000);
      expect(MockEventSource.instances).toHaveLength(2);

      // Successful reconnection
      MockEventSource.instances[1].simulateEvent(
        "connected",
        JSON.stringify({ sessionId: "sess_123" }),
      );

      // Next error should use 1s backoff again (not 2s)
      MockEventSource.instances[1].simulateError();
      vi.advanceTimersByTime(1000);
      expect(MockEventSource.instances).toHaveLength(3);
    });

    it("stops reconnecting after maxReconnectAttempts", () => {
      const onError = vi.fn();
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
        onError,
        maxReconnectAttempts: 2,
      });

      stream.connect();
      MockEventSource.instances[0].simulateEvent(
        "connected",
        JSON.stringify({ sessionId: "sess_123" }),
      );

      // First error → attempts reconnection
      MockEventSource.instances[0].simulateError();
      vi.advanceTimersByTime(1000);
      expect(MockEventSource.instances).toHaveLength(2);

      // Second error → attempts reconnection
      MockEventSource.instances[1].simulateError();
      vi.advanceTimersByTime(2000);
      expect(MockEventSource.instances).toHaveLength(3);

      // Third error → should NOT reconnect (max 2 attempts reached)
      MockEventSource.instances[2].simulateError();
      vi.advanceTimersByTime(60_000);
      expect(MockEventSource.instances).toHaveLength(3);

      expect(stream.getStatus()).toBe("disconnected");
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "RECONNECT_FAILED" }),
      );
    });
  });

  describe("reset()", () => {
    it("allows reconnection after explicit disconnect", () => {
      const stream = createPrescriptionStream({
        sessionId: "sess_123",
        onPrescription: vi.fn(),
      });

      stream.connect();
      stream.disconnect();
      stream.reset();
      stream.connect();

      expect(MockEventSource.instances).toHaveLength(2);
      expect(stream.getStatus()).toBe("connecting");
    });
  });
});
