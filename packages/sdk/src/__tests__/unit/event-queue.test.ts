import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventQueue } from '../../event-queue';
import type { AuraEvent } from '../../types';

function makeEvent(type: string = 'interaction.clicked', surfaceId: string = 'btn-1'): AuraEvent {
  return {
    type,
    surfaceId,
    timestamp: new Date().toISOString(),
    payload: { action: type },
  };
}

describe('EventQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create an empty queue with the given options', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      expect(queue.size()).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should add an event to the queue', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      queue.enqueue(makeEvent());
      expect(queue.size()).toBe(1);
    });

    it('should add multiple events to the queue', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      queue.enqueue(makeEvent('a'));
      queue.enqueue(makeEvent('b'));
      queue.enqueue(makeEvent('c'));
      expect(queue.size()).toBe(3);
    });

    it('should evict the oldest event when at capacity', () => {
      const queue = new EventQueue({ maxCapacity: 3, queueTTL: 60000 });

      queue.enqueue(makeEvent('first'));
      queue.enqueue(makeEvent('second'));
      queue.enqueue(makeEvent('third'));
      expect(queue.size()).toBe(3);

      // Enqueue a 4th event — oldest (first) should be evicted
      queue.enqueue(makeEvent('fourth'));
      expect(queue.size()).toBe(3);

      const flushed = queue.flush();
      expect(flushed).toHaveLength(3);
      expect(flushed[0].type).toBe('second');
      expect(flushed[1].type).toBe('third');
      expect(flushed[2].type).toBe('fourth');
    });

    it('should evict oldest events repeatedly at capacity', () => {
      const queue = new EventQueue({ maxCapacity: 2, queueTTL: 60000 });

      queue.enqueue(makeEvent('a'));
      queue.enqueue(makeEvent('b'));
      queue.enqueue(makeEvent('c'));
      queue.enqueue(makeEvent('d'));

      const flushed = queue.flush();
      expect(flushed).toHaveLength(2);
      expect(flushed[0].type).toBe('c');
      expect(flushed[1].type).toBe('d');
    });
  });

  describe('flush', () => {
    it('should return an empty array when the queue is empty', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      expect(queue.flush()).toEqual([]);
    });

    it('should return events in FIFO order', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });

      queue.enqueue(makeEvent('first'));
      vi.advanceTimersByTime(1000);
      queue.enqueue(makeEvent('second'));
      vi.advanceTimersByTime(1000);
      queue.enqueue(makeEvent('third'));

      const flushed = queue.flush();
      expect(flushed).toHaveLength(3);
      expect(flushed[0].type).toBe('first');
      expect(flushed[1].type).toBe('second');
      expect(flushed[2].type).toBe('third');
    });

    it('should remove all events from the queue after flush', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });

      queue.enqueue(makeEvent());
      queue.enqueue(makeEvent());
      queue.flush();

      expect(queue.size()).toBe(0);
      expect(queue.flush()).toEqual([]);
    });

    it('should filter out expired events (older than queueTTL)', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 5000 });

      queue.enqueue(makeEvent('old'));
      vi.advanceTimersByTime(6000); // Advance past TTL
      queue.enqueue(makeEvent('fresh'));

      const flushed = queue.flush();
      expect(flushed).toHaveLength(1);
      expect(flushed[0].type).toBe('fresh');
    });

    it('should keep events exactly at TTL boundary (age < TTL)', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 5000 });

      queue.enqueue(makeEvent('boundary'));
      vi.advanceTimersByTime(4999); // Just under the TTL

      const flushed = queue.flush();
      expect(flushed).toHaveLength(1);
      expect(flushed[0].type).toBe('boundary');
    });

    it('should drop events exactly at TTL (age == TTL)', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 5000 });

      queue.enqueue(makeEvent('exact'));
      vi.advanceTimersByTime(5000); // Exactly at TTL

      const flushed = queue.flush();
      expect(flushed).toHaveLength(0);
    });

    it('should drop all events if all are expired', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 1000 });

      queue.enqueue(makeEvent('a'));
      queue.enqueue(makeEvent('b'));
      vi.advanceTimersByTime(2000);

      const flushed = queue.flush();
      expect(flushed).toEqual([]);
      expect(queue.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 for a new queue', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      expect(queue.size()).toBe(0);
    });

    it('should reflect enqueued events', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      queue.enqueue(makeEvent());
      expect(queue.size()).toBe(1);
      queue.enqueue(makeEvent());
      expect(queue.size()).toBe(2);
    });

    it('should not exceed maxCapacity', () => {
      const queue = new EventQueue({ maxCapacity: 3, queueTTL: 60000 });
      for (let i = 0; i < 10; i++) {
        queue.enqueue(makeEvent());
      }
      expect(queue.size()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should empty the queue', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      queue.enqueue(makeEvent());
      queue.enqueue(makeEvent());
      queue.clear();
      expect(queue.size()).toBe(0);
      expect(queue.flush()).toEqual([]);
    });

    it('should be idempotent on an empty queue', () => {
      const queue = new EventQueue({ maxCapacity: 100, queueTTL: 60000 });
      queue.clear();
      expect(queue.size()).toBe(0);
    });
  });
});
