import type { AuraEvent } from "./types.js";

/**
 * Internal wrapper that associates a queued event with its enqueue timestamp.
 */
interface TimestampedEvent {
  event: AuraEvent;
  enqueuedAt: number; // Date.now() at enqueue time
}

/**
 * A bounded FIFO queue for AuraEvent objects with TTL-based eviction.
 *
 * - Events are timestamped internally when enqueued (via Date.now()).
 * - When the queue is at capacity, the oldest event is evicted to make room.
 * - On flush, events whose age exceeds `queueTTL` are silently dropped.
 * - In-memory only — no localStorage, IndexedDB, or other persistence.
 */
export class EventQueue {
  private readonly maxCapacity: number;
  private readonly queueTTL: number;
  private queue: TimestampedEvent[] = [];

  constructor(options: { maxCapacity: number; queueTTL: number }) {
    this.maxCapacity = options.maxCapacity;
    this.queueTTL = options.queueTTL;
  }

  /**
   * Adds an event to the queue with an internal timestamp.
   * If the queue is at capacity, the oldest event is evicted (FIFO eviction).
   */
  enqueue(event: AuraEvent): void {
    if (this.queue.length >= this.maxCapacity) {
      this.queue.shift();
    }

    this.queue.push({
      event,
      enqueuedAt: Date.now(),
    });
  }

  /**
   * Returns and removes all non-expired events in FIFO order.
   * Events whose age exceeds `queueTTL` are silently discarded.
   */
  flush(): AuraEvent[] {
    const now = Date.now();
    const valid = this.queue.filter((entry) => now - entry.enqueuedAt < this.queueTTL);

    this.queue = [];

    return valid.map((entry) => entry.event);
  }

  /**
   * Returns the current number of events in the queue (including potentially expired ones).
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Empties the queue immediately.
   */
  clear(): void {
    this.queue = [];
  }
}
