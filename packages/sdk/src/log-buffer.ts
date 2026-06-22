/**
 * Structured log entry for the SDK's internal circular log buffer.
 */
export interface AuraLogEntry {
  level: 'error' | 'warn';
  timestamp: string; // ISO 8601
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * A circular buffer that stores structured log entries.
 * When the buffer is full, the oldest entry is overwritten.
 * Retrieval returns entries in chronological order (oldest-first).
 */
export class LogBuffer {
  private readonly buffer: (AuraLogEntry | undefined)[];
  private readonly maxEntries: number;
  private head: number = 0;
  private count: number = 0;

  constructor(maxEntries: number = 200) {
    this.maxEntries = maxEntries;
    this.buffer = new Array(maxEntries);
  }

  /**
   * Adds a timestamped log entry to the buffer.
   * If the buffer is full, the oldest entry is evicted.
   */
  log(entry: Omit<AuraLogEntry, 'timestamp'>): void {
    const timestampedEntry: AuraLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.buffer[this.head] = timestampedEntry;
    this.head = (this.head + 1) % this.maxEntries;

    if (this.count < this.maxEntries) {
      this.count++;
    }
  }

  /**
   * Returns all log entries in chronological order (oldest-first).
   * Returns at most `maxEntries` entries.
   */
  getAll(): AuraLogEntry[] {
    if (this.count === 0) {
      return [];
    }

    const result: AuraLogEntry[] = [];

    // If buffer isn't full yet, entries start at index 0
    // If buffer is full, oldest entry is at `head` (since head points to next write position)
    const start = this.count < this.maxEntries ? 0 : this.head;

    for (let i = 0; i < this.count; i++) {
      const index = (start + i) % this.maxEntries;
      result.push(this.buffer[index] as AuraLogEntry);
    }

    return result;
  }
}
