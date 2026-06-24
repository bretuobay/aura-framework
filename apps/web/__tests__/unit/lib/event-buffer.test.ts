import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventBuffer, type EventSender } from "@/lib/events/buffer";
import type { AuraEvent } from "@aura/protocol";

function makeEvent(id: string): AuraEvent {
  return {
    type: "test.event",
    surfaceId: `surface-${id}`,
    timestamp: new Date().toISOString(),
    payload: { id },
  };
}

describe("EventBuffer", () => {
  let sender: EventSender;
  let senderCalls: AuraEvent[][];

  beforeEach(() => {
    senderCalls = [];
    sender = vi.fn(async (events: AuraEvent[]) => {
      senderCalls.push([...events]);
    });
  });

  describe("initial state", () => {
    it("should start with an empty buffer", () => {
      const buffer = createEventBuffer(sender);
      expect(buffer.events).toHaveLength(0);
    });

    it("should start connected", () => {
      const buffer = createEventBuffer(sender);
      expect(buffer.isConnected).toBe(true);
    });
  });

  describe("add - when connected", () => {
    it("should send event directly via the sender", () => {
      const buffer = createEventBuffer(sender);
      const event = makeEvent("1");

      buffer.add(event);

      expect(sender).toHaveBeenCalledWith([event]);
    });

    it("should not add events to the buffer when connected", async () => {
      const buffer = createEventBuffer(sender);
      const event = makeEvent("1");

      buffer.add(event);
      // Wait for the promise chain to resolve
      await vi.waitFor(() => {
        expect(buffer.events).toHaveLength(0);
      });
    });

    it("should buffer events if send fails", async () => {
      const failingSender: EventSender = vi.fn(async () => {
        throw new Error("Network error");
      });
      const buffer = createEventBuffer(failingSender);
      const event = makeEvent("1");

      buffer.add(event);

      // Wait for the catch handler to execute
      await vi.waitFor(() => {
        expect(buffer.events).toHaveLength(1);
        expect(buffer.events[0]).toEqual(event);
      });
    });
  });

  describe("add - when disconnected", () => {
    it("should buffer events when disconnected", () => {
      const buffer = createEventBuffer(sender);
      buffer.isConnected = false;

      const event = makeEvent("1");
      buffer.add(event);

      expect(buffer.events).toHaveLength(1);
      expect(buffer.events[0]).toEqual(event);
      expect(sender).not.toHaveBeenCalled();
    });

    it("should buffer multiple events in order", () => {
      const buffer = createEventBuffer(sender);
      buffer.isConnected = false;

      const event1 = makeEvent("1");
      const event2 = makeEvent("2");
      const event3 = makeEvent("3");

      buffer.add(event1);
      buffer.add(event2);
      buffer.add(event3);

      expect(buffer.events).toHaveLength(3);
      expect(buffer.events[0]).toEqual(event1);
      expect(buffer.events[1]).toEqual(event2);
      expect(buffer.events[2]).toEqual(event3);
    });
  });

  describe("buffer capacity (max 100)", () => {
    it("should hold up to 100 events", () => {
      const buffer = createEventBuffer(sender);
      buffer.isConnected = false;

      for (let i = 0; i < 100; i++) {
        buffer.add(makeEvent(String(i)));
      }

      expect(buffer.events).toHaveLength(100);
    });

    it("should discard oldest event when exceeding 100", () => {
      const buffer = createEventBuffer(sender);
      buffer.isConnected = false;

      for (let i = 0; i < 101; i++) {
        buffer.add(makeEvent(String(i)));
      }

      expect(buffer.events).toHaveLength(100);
      // The first event (id "0") should have been discarded
      expect(buffer.events[0].payload).toEqual({ id: "1" });
      // The last event (id "100") should be at the end
      expect(buffer.events[99].payload).toEqual({ id: "100" });
    });

    it("should continue discarding oldest events as new ones arrive", () => {
      const buffer = createEventBuffer(sender);
      buffer.isConnected = false;

      // Fill buffer to capacity
      for (let i = 0; i < 100; i++) {
        buffer.add(makeEvent(String(i)));
      }

      // Add 10 more events
      for (let i = 100; i < 110; i++) {
        buffer.add(makeEvent(String(i)));
      }

      expect(buffer.events).toHaveLength(100);
      // Oldest 10 should have been discarded
      expect(buffer.events[0].payload).toEqual({ id: "10" });
      expect(buffer.events[99].payload).toEqual({ id: "109" });
    });
  });

  describe("flush", () => {
    it("should send all buffered events", async () => {
      const buffer = createEventBuffer(sender);
      buffer.isConnected = false;

      buffer.add(makeEvent("1"));
      buffer.add(makeEvent("2"));
      buffer.add(makeEvent("3"));

      await buffer.flush();

      expect(sender).toHaveBeenCalledTimes(1);
      expect(senderCalls[0]).toHaveLength(3);
    });

    it("should clear the buffer after successful flush", async () => {
      const buffer = createEventBuffer(sender);
      buffer.isConnected = false;

      buffer.add(makeEvent("1"));
      buffer.add(makeEvent("2"));

      await buffer.flush();

      expect(buffer.events).toHaveLength(0);
    });

    it("should do nothing when buffer is empty", async () => {
      const buffer = createEventBuffer(sender);

      await buffer.flush();

      expect(sender).not.toHaveBeenCalled();
    });

    it("should propagate errors from the sender on flush", async () => {
      const failingSender: EventSender = vi.fn(async () => {
        throw new Error("Delivery failed");
      });
      const buffer = createEventBuffer(failingSender);
      buffer.isConnected = false;

      buffer.add(makeEvent("1"));

      await expect(buffer.flush()).rejects.toThrow("Delivery failed");
      // Buffer should retain events on failure
      expect(buffer.events).toHaveLength(1);
    });
  });

  describe("connection state changes", () => {
    it("should allow toggling connection state", () => {
      const buffer = createEventBuffer(sender);

      expect(buffer.isConnected).toBe(true);

      buffer.isConnected = false;
      expect(buffer.isConnected).toBe(false);

      buffer.isConnected = true;
      expect(buffer.isConnected).toBe(true);
    });

    it("should buffer when disconnected and send directly when reconnected", () => {
      const buffer = createEventBuffer(sender);

      // Disconnect and buffer
      buffer.isConnected = false;
      buffer.add(makeEvent("1"));
      expect(sender).not.toHaveBeenCalled();

      // Reconnect and send directly
      buffer.isConnected = true;
      buffer.add(makeEvent("2"));
      expect(sender).toHaveBeenCalledTimes(1);
    });
  });
});
