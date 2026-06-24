/**
 * Event system types for the AURA E-Commerce Demo.
 * Defines the event buffer, typed event payloads, and event constructors.
 *
 * @see Requirements 5.7
 */

import type { AuraEvent } from "@aura/protocol";

// Re-export AuraEvent for convenience
export type { AuraEvent } from "@aura/protocol";

/**
 * Event buffer for managing event delivery when the AURA middleware is unreachable.
 * Buffers up to 100 events and flushes on reconnection.
 *
 * @see Requirements 5.8
 */
export interface EventBuffer {
  /** Buffered events, max 100. Oldest discarded on overflow. */
  events: AuraEvent[];
  /** Whether the middleware connection is currently active */
  isConnected: boolean;
  /** Flush all buffered events to the middleware (retry delivery) */
  flush(): Promise<void>;
  /** Add an event to the buffer. Buffers if disconnected, sends directly if connected. */
  add(event: AuraEvent): void;
}

// --- Typed Event Payloads ---

/**
 * Base fields included in every event emitted by the application.
 * @see Requirements 5.7
 */
export interface BaseEventFields {
  /** Session identifier, non-empty */
  sessionId: string;
  /** ISO 8601 timestamp of the event */
  timestamp: string;
}

/**
 * Payload for "surface.viewed" events.
 * Emitted when search results render on screen.
 *
 * @see Requirements 5.1
 */
export interface SurfaceViewedPayload extends BaseEventFields {
  /** The surface identifier (e.g. "search.results") */
  surfaceId: string;
  /** Number of results currently displayed */
  resultCount: number;
}

/**
 * Payload for "search.submitted" events.
 * Emitted when a user submits a search query.
 * Query text is truncated to 256 characters maximum.
 *
 * @see Requirements 5.2
 */
export interface SearchSubmittedPayload extends BaseEventFields {
  /** Search query text, max 256 characters */
  query: string;
}

/**
 * Payload for "interaction.clicked" events.
 * Emitted when a user clicks a product or filter.
 *
 * @see Requirements 5.3
 */
export interface InteractionClickedPayload extends BaseEventFields {
  /** Type of element clicked */
  elementType: "product" | "filter";
  /** Identifier of the clicked element */
  elementId: string;
}

/**
 * Payload for "interaction.dwelled" events.
 * Emitted when a user dwells on a product for 1000ms or longer.
 *
 * @see Requirements 5.4
 */
export interface InteractionDwelledPayload extends BaseEventFields {
  /** Product identifier the user dwelled on */
  productId: string;
  /** Duration of the dwell in milliseconds (≥1000) */
  durationMs: number;
}

/**
 * Payload for "context.changed" events.
 * Emitted when device or viewport properties change.
 *
 * @see Requirements 5.5
 */
export interface ContextChangedPayload extends BaseEventFields {
  /** Name of the changed property (e.g. "viewport.width", "device.type") */
  property: string;
  /** New value of the property */
  value: string | number | boolean;
}

/**
 * Payload for "feedback.submitted" events.
 * Emitted when a user accepts, dismisses, or overrides a prescription.
 *
 * @see Requirements 5.6
 */
export interface FeedbackSubmittedPayload extends BaseEventFields {
  /** The prescription identifier */
  prescriptionId: string;
  /** The action taken by the user */
  action: "accept" | "dismiss" | "override";
}

/**
 * Union of all typed event payloads.
 */
export type EventPayload =
  | SurfaceViewedPayload
  | SearchSubmittedPayload
  | InteractionClickedPayload
  | InteractionDwelledPayload
  | ContextChangedPayload
  | FeedbackSubmittedPayload;

/**
 * Map of event type strings to their payload types.
 */
export interface EventPayloadMap {
  "surface.viewed": SurfaceViewedPayload;
  "search.submitted": SearchSubmittedPayload;
  "interaction.clicked": InteractionClickedPayload;
  "interaction.dwelled": InteractionDwelledPayload;
  "context.changed": ContextChangedPayload;
  "feedback.submitted": FeedbackSubmittedPayload;
}

/**
 * All recognized event type strings.
 */
export type EventType = keyof EventPayloadMap;
