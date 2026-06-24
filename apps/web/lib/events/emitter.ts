/**
 * Event emission layer for the AURA E-Commerce Demo.
 *
 * Provides typed event builder functions for all AURA event types.
 * Each builder automatically attaches sessionId and ISO 8601 timestamp.
 * Framework-agnostic — pure functions (hooks will wrap these later).
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9
 */

import type {
  SurfaceViewedPayload,
  SearchSubmittedPayload,
  InteractionClickedPayload,
  InteractionDwelledPayload,
  ContextChangedPayload,
  FeedbackSubmittedPayload,
  EventPayload,
  EventType,
} from "@/lib/types";

/** Maximum length for search query in event payload */
const MAX_SEARCH_QUERY_LENGTH = 256;

/**
 * Session ID provider function type.
 * Returns the current session ID (non-empty string).
 */
export type SessionIdProvider = () => string;

/**
 * Listener callback invoked when an event is emitted.
 */
export type EventListener = (type: EventType, payload: EventPayload) => void;

/**
 * Configuration for the event emitter.
 */
export interface EmitterConfig {
  /** Function that returns the current session ID */
  getSessionId: SessionIdProvider;
  /** Optional listener called on every event emission */
  onEmit?: EventListener;
}

/**
 * Creates base event fields (sessionId + ISO 8601 timestamp) to attach to every event.
 */
function createBaseFields(getSessionId: SessionIdProvider) {
  return {
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Truncates a string to the specified max length.
 */
function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength);
}

/**
 * Emit a "surface.viewed" event when search results render on screen.
 *
 * @param config - Emitter configuration
 * @param surfaceId - The surface identifier (e.g. "search.results")
 * @param resultCount - Number of results currently displayed
 * @returns The constructed event payload
 *
 * @see Requirements 5.1
 */
export function emitSurfaceViewed(
  config: EmitterConfig,
  surfaceId: string,
  resultCount: number
): SurfaceViewedPayload {
  const payload: SurfaceViewedPayload = {
    ...createBaseFields(config.getSessionId),
    surfaceId,
    resultCount,
  };
  config.onEmit?.("surface.viewed", payload);
  return payload;
}

/**
 * Emit a "search.submitted" event when a user submits a search query.
 * Automatically truncates query to 256 characters.
 *
 * @param config - Emitter configuration
 * @param query - The raw search query text
 * @returns The constructed event payload (with truncated query)
 *
 * @see Requirements 5.2
 */
export function emitSearchSubmitted(
  config: EmitterConfig,
  query: string
): SearchSubmittedPayload {
  const payload: SearchSubmittedPayload = {
    ...createBaseFields(config.getSessionId),
    query: truncate(query, MAX_SEARCH_QUERY_LENGTH),
  };
  config.onEmit?.("search.submitted", payload);
  return payload;
}

/**
 * Emit an "interaction.clicked" event when a user clicks a product or filter.
 *
 * @param config - Emitter configuration
 * @param elementType - Type of element clicked ("product" or "filter")
 * @param elementId - Identifier of the clicked element
 * @returns The constructed event payload
 *
 * @see Requirements 5.3
 */
export function emitInteractionClicked(
  config: EmitterConfig,
  elementType: "product" | "filter",
  elementId: string
): InteractionClickedPayload {
  const payload: InteractionClickedPayload = {
    ...createBaseFields(config.getSessionId),
    elementType,
    elementId,
  };
  config.onEmit?.("interaction.clicked", payload);
  return payload;
}

/**
 * Emit an "interaction.dwelled" event when a user dwells on a product for ≥1000ms.
 *
 * @param config - Emitter configuration
 * @param productId - Product identifier the user dwelled on
 * @param durationMs - Duration of the dwell in milliseconds (should be ≥1000)
 * @returns The constructed event payload
 *
 * @see Requirements 5.4
 */
export function emitInteractionDwelled(
  config: EmitterConfig,
  productId: string,
  durationMs: number
): InteractionDwelledPayload {
  const payload: InteractionDwelledPayload = {
    ...createBaseFields(config.getSessionId),
    productId,
    durationMs,
  };
  config.onEmit?.("interaction.dwelled", payload);
  return payload;
}

/**
 * Emit a "context.changed" event when device or viewport properties change.
 *
 * @param config - Emitter configuration
 * @param property - Name of the changed property (e.g. "viewport.width")
 * @param value - New value of the property
 * @returns The constructed event payload
 *
 * @see Requirements 5.5
 */
export function emitContextChanged(
  config: EmitterConfig,
  property: string,
  value: string | number | boolean
): ContextChangedPayload {
  const payload: ContextChangedPayload = {
    ...createBaseFields(config.getSessionId),
    property,
    value,
  };
  config.onEmit?.("context.changed", payload);
  return payload;
}

/**
 * Emit a "feedback.submitted" event when a user accepts, dismisses, or overrides a prescription.
 *
 * @param config - Emitter configuration
 * @param prescriptionId - The prescription identifier
 * @param action - The action taken by the user
 * @returns The constructed event payload
 *
 * @see Requirements 5.6
 */
export function emitFeedbackSubmitted(
  config: EmitterConfig,
  prescriptionId: string,
  action: "accept" | "dismiss" | "override"
): FeedbackSubmittedPayload {
  const payload: FeedbackSubmittedPayload = {
    ...createBaseFields(config.getSessionId),
    prescriptionId,
    action,
  };
  config.onEmit?.("feedback.submitted", payload);
  return payload;
}

/**
 * Creates a bound emitter instance with a fixed session ID provider and listener.
 * Convenient for use across the application without passing config every time.
 */
export function createEventEmitter(config: EmitterConfig) {
  return {
    surfaceViewed: (surfaceId: string, resultCount: number) =>
      emitSurfaceViewed(config, surfaceId, resultCount),

    searchSubmitted: (query: string) =>
      emitSearchSubmitted(config, query),

    interactionClicked: (elementType: "product" | "filter", elementId: string) =>
      emitInteractionClicked(config, elementType, elementId),

    interactionDwelled: (productId: string, durationMs: number) =>
      emitInteractionDwelled(config, productId, durationMs),

    contextChanged: (property: string, value: string | number | boolean) =>
      emitContextChanged(config, property, value),

    feedbackSubmitted: (prescriptionId: string, action: "accept" | "dismiss" | "override") =>
      emitFeedbackSubmitted(config, prescriptionId, action),
  };
}
