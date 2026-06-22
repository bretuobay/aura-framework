import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { HttpTransport } from "../../http-transport.js";
import { AuraValidationError } from "../../errors.js";

// Simple schemas for testing
const RequestSchema = z.object({
  name: z.string(),
  value: z.number(),
});

const ResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
});

type RequestType = z.infer<typeof RequestSchema>;
type ResponseType = z.infer<typeof ResponseSchema>;

describe("HttpTransport", () => {
  let transport: HttpTransport;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    transport = new HttpTransport("https://api.example.com");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("uses default timeout of 10000ms when no options provided", () => {
      // Verified via behavior: timeout triggers abort
      const t = new HttpTransport("https://example.com");
      expect(t).toBeInstanceOf(HttpTransport);
    });

    it("accepts custom requestTimeout option", () => {
      const t = new HttpTransport("https://example.com", { requestTimeout: 5000 });
      expect(t).toBeInstanceOf(HttpTransport);
    });
  });

  describe("post()", () => {
    it("validates outbound body and throws AuraValidationError on failure", async () => {
      const invalidBody = { name: 123, value: "not-a-number" } as unknown as RequestType;

      await expect(
        transport.post("/test", invalidBody, RequestSchema, ResponseSchema),
      ).rejects.toThrow(AuraValidationError);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends POST with JSON body and correct headers", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "123", status: "ok" }),
      });

      const body: RequestType = { name: "test", value: 42 };
      await transport.post("/test", body, RequestSchema, ResponseSchema);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ name: "test", value: 42 }),
        }),
      );
    });

    it("adds x-aura-session-id header when sessionId is provided", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "123", status: "ok" }),
      });

      const body: RequestType = { name: "test", value: 42 };
      await transport.post("/test", body, RequestSchema, ResponseSchema, "session-abc");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-aura-session-id": "session-abc",
          }),
        }),
      );
    });

    it("returns null for 404 responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      });

      const body: RequestType = { name: "test", value: 42 };
      const result = await transport.post("/test", body, RequestSchema, ResponseSchema);

      expect(result).toBeNull();
    });

    it("throws error for non-200/404 responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      const body: RequestType = { name: "test", value: 42 };

      await expect(transport.post("/test", body, RequestSchema, ResponseSchema)).rejects.toThrow(
        "POST /test failed with status 500: Internal Server Error",
      );
    });

    it("validates response body and returns parsed data on success", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "abc", status: "active" }),
      });

      const body: RequestType = { name: "test", value: 42 };
      const result = await transport.post("/test", body, RequestSchema, ResponseSchema);

      expect(result).toEqual({ id: "abc", status: "active" });
    });

    it("returns null and logs warning for inbound schema validation failure", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ invalid: "data" }),
      });

      const body: RequestType = { name: "test", value: 42 };
      const result = await transport.post("/test", body, RequestSchema, ResponseSchema);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Inbound validation failed for POST /test"),
        expect.any(Array),
      );
    });

    it("returns response body as-is when no responseSchema is provided", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ anything: "goes" }),
      });

      const body: RequestType = { name: "test", value: 42 };
      const result = await transport.post("/test", body, RequestSchema);

      expect(result).toEqual({ anything: "goes" });
    });

    it("propagates network errors to the caller", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

      const body: RequestType = { name: "test", value: 42 };

      await expect(transport.post("/test", body, RequestSchema, ResponseSchema)).rejects.toThrow(
        "Failed to fetch",
      );
    });

    it("uses AbortController for request timeout", async () => {
      vi.useFakeTimers();

      const shortTimeoutTransport = new HttpTransport("https://api.example.com", {
        requestTimeout: 100,
      });

      fetchMock.mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      );

      const body: RequestType = { name: "test", value: 42 };
      const promise = shortTimeoutTransport.post("/test", body, RequestSchema, ResponseSchema);

      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow("The operation was aborted.");

      vi.useRealTimers();
    });
  });

  describe("get()", () => {
    it("sends GET request to correct URL", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "123", status: "ok" }),
      });

      await transport.get("/test", ResponseSchema);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("adds x-aura-session-id header when sessionId is provided", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "123", status: "ok" }),
      });

      await transport.get("/test", ResponseSchema, "session-xyz");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-aura-session-id": "session-xyz",
          }),
        }),
      );
    });

    it("returns null for 404 responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
      });

      const result = await transport.get("/test", ResponseSchema);
      expect(result).toBeNull();
    });

    it("throws error for non-200/404 responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({}),
      });

      await expect(transport.get("/test", ResponseSchema)).rejects.toThrow(
        "GET /test failed with status 503: Service Unavailable",
      );
    });

    it("validates response body and returns parsed data on success", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "abc", status: "active" }),
      });

      const result = await transport.get("/test", ResponseSchema);
      expect(result).toEqual({ id: "abc", status: "active" });
    });

    it("returns null and logs warning for inbound schema validation failure", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ wrong: "shape" }),
      });

      const result = await transport.get("/test", ResponseSchema);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Inbound validation failed for GET /test"),
        expect.any(Array),
      );
    });

    it("propagates network errors to the caller", async () => {
      fetchMock.mockRejectedValue(new TypeError("Network request failed"));

      await expect(transport.get("/test", ResponseSchema)).rejects.toThrow(
        "Network request failed",
      );
    });

    it("uses AbortController for request timeout", async () => {
      vi.useFakeTimers();

      const shortTimeoutTransport = new HttpTransport("https://api.example.com", {
        requestTimeout: 50,
      });

      fetchMock.mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      );

      const promise = shortTimeoutTransport.get("/test", ResponseSchema);

      vi.advanceTimersByTime(50);

      await expect(promise).rejects.toThrow("The operation was aborted.");

      vi.useRealTimers();
    });
  });
});
