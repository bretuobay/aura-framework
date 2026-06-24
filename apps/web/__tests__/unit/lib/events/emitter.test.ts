/**
 * Unit tests for the event emission layer.
 *
 * Validates that:
 * - Every event includes sessionId and ISO 8601 timestamp
 * - Search query is truncated to 256 characters
 * - All event builders produce correctly typed payloads
 * - onEmit listener is called with the correct event type and payload
 * - Events are emitted synchronously (within 200ms constraint by design)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  emitSurfaceViewed,
  emitSearchSubmitted,
  emitInteractionClicked,
  emitInteractionDwelled,
  emitContextChanged,
  emitFeedbackSubmitted,
  createEventEmitter,
  type EmitterConfig,
} from "@/lib/events/emitter";

const TEST_SESSION_ID = "session-abc-123";

function createTestConfig(overrides?: Partial<EmitterConfig>): EmitterConfig {
  return {
    getSessionId: () => TEST_SESSION_ID,
    onEmit: vi.fn(),
    ...overrides,
  };
}

/** Validates that a string is a valid ISO 8601 timestamp */
function isIso8601(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

describe("Event Emitter", () => {
  let config: EmitterConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  describe("Base fields", () => {
    it("includes sessionId in every event", () => {
      const payload = emitSurfaceViewed(config, "search.results", 10);
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("includes a valid ISO 8601 timestamp in every event", () => {
      const payload = emitSurfaceViewed(config, "search.results", 10);
      expect(isIso8601(payload.timestamp)).toBe(true);
    });

    it("uses the session ID provider function", () => {
      const customId = "custom-session-456";
      const customConfig = createTestConfig({
        getSessionId: () => customId,
      });
      const payload = emitSearchSubmitted(customConfig, "test query");
      expect(payload.sessionId).toBe(customId);
    });
  });

  describe("emitSurfaceViewed", () => {
    it("creates a surface.viewed event with surfaceId and resultCount", () => {
      const payload = emitSurfaceViewed(config, "search.results", 20);
      expect(payload.surfaceId).toBe("search.results");
      expect(payload.resultCount).toBe(20);
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("calls onEmit listener with correct type", () => {
      const payload = emitSurfaceViewed(config, "filter.panel", 5);
      expect(config.onEmit).toHaveBeenCalledWith("surface.viewed", payload);
    });
  });

  describe("emitSearchSubmitted", () => {
    it("creates a search.submitted event with query", () => {
      const payload = emitSearchSubmitted(config, "laptop");
      expect(payload.query).toBe("laptop");
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("truncates query to 256 characters", () => {
      const longQuery = "a".repeat(300);
      const payload = emitSearchSubmitted(config, longQuery);
      expect(payload.query.length).toBe(256);
      expect(payload.query).toBe("a".repeat(256));
    });

    it("does not truncate query at exactly 256 characters", () => {
      const exactQuery = "b".repeat(256);
      const payload = emitSearchSubmitted(config, exactQuery);
      expect(payload.query.length).toBe(256);
      expect(payload.query).toBe(exactQuery);
    });

    it("does not truncate short queries", () => {
      const shortQuery = "headphones";
      const payload = emitSearchSubmitted(config, shortQuery);
      expect(payload.query).toBe(shortQuery);
    });

    it("calls onEmit listener with correct type", () => {
      const payload = emitSearchSubmitted(config, "test");
      expect(config.onEmit).toHaveBeenCalledWith("search.submitted", payload);
    });
  });

  describe("emitInteractionClicked", () => {
    it("creates an interaction.clicked event for product click", () => {
      const payload = emitInteractionClicked(config, "product", "prod_001");
      expect(payload.elementType).toBe("product");
      expect(payload.elementId).toBe("prod_001");
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("creates an interaction.clicked event for filter click", () => {
      const payload = emitInteractionClicked(config, "filter", "category-laptops");
      expect(payload.elementType).toBe("filter");
      expect(payload.elementId).toBe("category-laptops");
    });

    it("calls onEmit listener with correct type", () => {
      const payload = emitInteractionClicked(config, "product", "prod_002");
      expect(config.onEmit).toHaveBeenCalledWith("interaction.clicked", payload);
    });
  });

  describe("emitInteractionDwelled", () => {
    it("creates an interaction.dwelled event with productId and durationMs", () => {
      const payload = emitInteractionDwelled(config, "prod_010", 1500);
      expect(payload.productId).toBe("prod_010");
      expect(payload.durationMs).toBe(1500);
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("calls onEmit listener with correct type", () => {
      const payload = emitInteractionDwelled(config, "prod_005", 2000);
      expect(config.onEmit).toHaveBeenCalledWith("interaction.dwelled", payload);
    });
  });

  describe("emitContextChanged", () => {
    it("creates a context.changed event with string value", () => {
      const payload = emitContextChanged(config, "device.type", "mobile");
      expect(payload.property).toBe("device.type");
      expect(payload.value).toBe("mobile");
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("creates a context.changed event with number value", () => {
      const payload = emitContextChanged(config, "viewport.width", 1024);
      expect(payload.property).toBe("viewport.width");
      expect(payload.value).toBe(1024);
    });

    it("creates a context.changed event with boolean value", () => {
      const payload = emitContextChanged(config, "prefers-reduced-motion", true);
      expect(payload.property).toBe("prefers-reduced-motion");
      expect(payload.value).toBe(true);
    });

    it("calls onEmit listener with correct type", () => {
      const payload = emitContextChanged(config, "viewport.width", 768);
      expect(config.onEmit).toHaveBeenCalledWith("context.changed", payload);
    });
  });

  describe("emitFeedbackSubmitted", () => {
    it("creates a feedback.submitted event with accept action", () => {
      const payload = emitFeedbackSubmitted(config, "rx_001", "accept");
      expect(payload.prescriptionId).toBe("rx_001");
      expect(payload.action).toBe("accept");
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("creates a feedback.submitted event with dismiss action", () => {
      const payload = emitFeedbackSubmitted(config, "rx_002", "dismiss");
      expect(payload.action).toBe("dismiss");
    });

    it("creates a feedback.submitted event with override action", () => {
      const payload = emitFeedbackSubmitted(config, "rx_003", "override");
      expect(payload.action).toBe("override");
    });

    it("calls onEmit listener with correct type", () => {
      const payload = emitFeedbackSubmitted(config, "rx_001", "accept");
      expect(config.onEmit).toHaveBeenCalledWith("feedback.submitted", payload);
    });
  });

  describe("createEventEmitter", () => {
    it("creates a bound emitter with all event methods", () => {
      const emitter = createEventEmitter(config);
      expect(emitter.surfaceViewed).toBeDefined();
      expect(emitter.searchSubmitted).toBeDefined();
      expect(emitter.interactionClicked).toBeDefined();
      expect(emitter.interactionDwelled).toBeDefined();
      expect(emitter.contextChanged).toBeDefined();
      expect(emitter.feedbackSubmitted).toBeDefined();
    });

    it("bound methods use the configured session ID", () => {
      const emitter = createEventEmitter(config);
      const payload = emitter.surfaceViewed("search.results", 15);
      expect(payload.sessionId).toBe(TEST_SESSION_ID);
    });

    it("bound searchSubmitted truncates query", () => {
      const emitter = createEventEmitter(config);
      const payload = emitter.searchSubmitted("x".repeat(500));
      expect(payload.query.length).toBe(256);
    });

    it("bound methods call onEmit listener", () => {
      const emitter = createEventEmitter(config);
      emitter.interactionClicked("product", "prod_001");
      expect(config.onEmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Emission timing", () => {
    it("emits events synchronously (no async delay)", () => {
      const startTime = performance.now();
      emitSurfaceViewed(config, "search.results", 10);
      emitSearchSubmitted(config, "test");
      emitInteractionClicked(config, "product", "p1");
      emitInteractionDwelled(config, "p1", 1000);
      emitContextChanged(config, "viewport.width", 1024);
      emitFeedbackSubmitted(config, "rx_001", "accept");
      const elapsed = performance.now() - startTime;

      // All 6 events should complete well within 200ms (they are synchronous)
      expect(elapsed).toBeLessThan(200);
      expect(config.onEmit).toHaveBeenCalledTimes(6);
    });
  });

  describe("Edge cases", () => {
    it("handles empty string query", () => {
      const payload = emitSearchSubmitted(config, "");
      expect(payload.query).toBe("");
    });

    it("handles query at exactly 256 chars boundary", () => {
      const payload = emitSearchSubmitted(config, "c".repeat(256));
      expect(payload.query.length).toBe(256);
    });

    it("handles query at 257 chars (one over limit)", () => {
      const payload = emitSearchSubmitted(config, "d".repeat(257));
      expect(payload.query.length).toBe(256);
    });

    it("works without onEmit listener configured", () => {
      const noListenerConfig: EmitterConfig = {
        getSessionId: () => "session-no-listener",
      };
      const payload = emitSurfaceViewed(noListenerConfig, "test", 5);
      expect(payload.sessionId).toBe("session-no-listener");
      expect(payload.surfaceId).toBe("test");
    });
  });
});
