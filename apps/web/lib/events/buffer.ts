/**
 * Event buffer with retry logic for the AURA E-Commerce Demo.
 *
 * Buffers events in memory when the AURA middleware is unreachable,
 * flushes them on reconnect, and discards the oldest events when
 * the buffer exceeds 100 entries (FIFO eviction).
 *
 * @see Requirements 5.8
 */

import type { AuraEvent } from "@aura/protocol";
import type { EventBuffer } from "@/lib/types/events";

/** Maximum number of events the buffer will hold. */
export const MAX_BUFFER_SIZE = 100;

/**
 * A sender function responsible for delivering events to the AURA middleware.
 */
export type EventSender = (events: AuraEvent[]) => Promise<void>;

/**
 * Creates an EventBuffer instance that manages event delivery and buffering.
 *
 * @param sender - async function that delivers events to the middleware
 * @returns An EventBuffer implementation
 */
export function createEventBuffer(sender: EventSender): EventBuffer {
  const buffer: AuraEvent[] = [];
  let connected = true;

  const eventBuffer: EventBuffer = {
    get events(): AuraEvent[] {
      return buffer;
    },

    get isConnected(): boolean {
      return connected;
    },

    set isConnected(value: boolean) {
      connected = value;
    },

    add(event: AuraEvent): void {
      if (connected) {
        // When connected, attempt to send directly.
        // If the send fails, buffer the event.
        sender([event]).catch(() => {
          bufferEvent(event);
        });
      } else {
        bufferEvent(event);
      }
    },

    async flush(): Promise<void> {
      if (buffer.length === 0) {
        return;
      }

      // Copy current buffer contents and attempt delivery
      const eventsToSend = [...buffer];

      await sender(eventsToSend);

      // On success, remove the sent events from the buffer
      buffer.splice(0, eventsToSend.length);
    },
  };

  function bufferEvent(event: AuraEvent): void {
    if (buffer.length >= MAX_BUFFER_SIZE) {
      // Discard the oldest event (FIFO)
      buffer.shift();
    }
    buffer.push(event);
  }

  return eventBuffer;
}
