import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LogBuffer } from "../../log-buffer";

describe("LogBuffer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a buffer with default maxEntries of 200", () => {
    const buffer = new LogBuffer();
    expect(buffer.getAll()).toEqual([]);
  });

  it("should create a buffer with custom maxEntries", () => {
    const buffer = new LogBuffer(5);
    expect(buffer.getAll()).toEqual([]);
  });

  it("should add a timestamped entry via log()", () => {
    vi.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
    const buffer = new LogBuffer();

    buffer.log({ level: "error", code: "TEST_ERROR", message: "Something failed" });

    const entries = buffer.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      level: "error",
      code: "TEST_ERROR",
      message: "Something failed",
      timestamp: "2024-01-15T10:30:00.000Z",
    });
  });

  it("should preserve optional context field", () => {
    vi.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
    const buffer = new LogBuffer();

    buffer.log({
      level: "warn",
      code: "STALE_CONTEXT",
      message: "Context lock mismatch",
      context: { surfaceId: "header", expected: 3, actual: 1 },
    });

    const entries = buffer.getAll();
    expect(entries[0].context).toEqual({ surfaceId: "header", expected: 3, actual: 1 });
  });

  it("should return entries in chronological order (oldest-first)", () => {
    const buffer = new LogBuffer();

    vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
    buffer.log({ level: "warn", code: "A", message: "First" });

    vi.setSystemTime(new Date("2024-01-15T10:01:00.000Z"));
    buffer.log({ level: "error", code: "B", message: "Second" });

    vi.setSystemTime(new Date("2024-01-15T10:02:00.000Z"));
    buffer.log({ level: "warn", code: "C", message: "Third" });

    const entries = buffer.getAll();
    expect(entries).toHaveLength(3);
    expect(entries[0].code).toBe("A");
    expect(entries[1].code).toBe("B");
    expect(entries[2].code).toBe("C");
  });

  it("should evict the oldest entry when full (circular behavior)", () => {
    const buffer = new LogBuffer(3);

    vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
    buffer.log({ level: "warn", code: "A", message: "First" });

    vi.setSystemTime(new Date("2024-01-15T10:01:00.000Z"));
    buffer.log({ level: "warn", code: "B", message: "Second" });

    vi.setSystemTime(new Date("2024-01-15T10:02:00.000Z"));
    buffer.log({ level: "warn", code: "C", message: "Third" });

    // Buffer is full, this should evict 'A'
    vi.setSystemTime(new Date("2024-01-15T10:03:00.000Z"));
    buffer.log({ level: "error", code: "D", message: "Fourth" });

    const entries = buffer.getAll();
    expect(entries).toHaveLength(3);
    expect(entries[0].code).toBe("B");
    expect(entries[1].code).toBe("C");
    expect(entries[2].code).toBe("D");
  });

  it("should maintain chronological order after multiple wraps", () => {
    const buffer = new LogBuffer(3);

    // Fill and wrap multiple times
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(new Date(`2024-01-15T10:0${i}:00.000Z`));
      buffer.log({ level: "warn", code: `E${i}`, message: `Entry ${i}` });
    }

    const entries = buffer.getAll();
    expect(entries).toHaveLength(3);
    // Should have the 3 most recent entries in order
    expect(entries[0].code).toBe("E7");
    expect(entries[1].code).toBe("E8");
    expect(entries[2].code).toBe("E9");
  });

  it("should hold at most maxEntries entries", () => {
    const buffer = new LogBuffer(5);

    for (let i = 0; i < 100; i++) {
      buffer.log({ level: "warn", code: `CODE_${i}`, message: `Message ${i}` });
    }

    expect(buffer.getAll()).toHaveLength(5);
  });

  it("should support both error and warn levels", () => {
    const buffer = new LogBuffer();

    buffer.log({ level: "error", code: "ERR", message: "An error" });
    buffer.log({ level: "warn", code: "WARN", message: "A warning" });

    const entries = buffer.getAll();
    expect(entries[0].level).toBe("error");
    expect(entries[1].level).toBe("warn");
  });

  it("should generate ISO 8601 timestamps", () => {
    vi.setSystemTime(new Date("2024-06-20T14:30:45.123Z"));
    const buffer = new LogBuffer();

    buffer.log({ level: "error", code: "TEST", message: "Test" });

    const entries = buffer.getAll();
    expect(entries[0].timestamp).toBe("2024-06-20T14:30:45.123Z");
    // Verify it's valid ISO 8601
    expect(new Date(entries[0].timestamp).toISOString()).toBe(entries[0].timestamp);
  });

  it("should return a new array each time getAll() is called", () => {
    const buffer = new LogBuffer();
    buffer.log({ level: "warn", code: "X", message: "test" });

    const first = buffer.getAll();
    const second = buffer.getAll();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});
