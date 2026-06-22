import type { ZodSchema } from "zod";
import { AuraValidationError } from "./errors.js";

/** Default request timeout in milliseconds. */
const DEFAULT_REQUEST_TIMEOUT = 10_000;

/**
 * Fetch-based HTTP transport for AUIP communication.
 *
 * - Validates outbound request bodies against Zod schemas before sending.
 * - Validates inbound response bodies against Zod schemas after receiving.
 * - Returns `null` for 404 responses.
 * - Throws `AuraValidationError` for outbound schema failures.
 * - Returns `null` and logs warning for inbound schema failures.
 * - Lets network errors propagate to the caller for graceful degradation handling.
 */
export class HttpTransport {
  private readonly endpoint: string;
  private readonly requestTimeout: number;

  constructor(endpoint: string, options?: { requestTimeout?: number }) {
    this.endpoint = endpoint;
    this.requestTimeout = options?.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT;
  }

  /**
   * Send a POST request with validated request body.
   *
   * @param path - URL path appended to the endpoint
   * @param body - Request body to serialize as JSON
   * @param requestSchema - Zod schema to validate outbound body
   * @param responseSchema - Optional Zod schema to validate inbound response
   * @param sessionId - Optional session ID added as header
   * @returns Parsed response body, or `null` for 404 / inbound validation failure
   * @throws AuraValidationError if outbound body fails schema validation
   * @throws Error on non-200/404 responses or network errors
   */
  async post<TReq, TRes>(
    path: string,
    body: TReq,
    requestSchema: ZodSchema<TReq>,
    responseSchema?: ZodSchema<TRes>,
    sessionId?: string,
  ): Promise<TRes | null> {
    // Validate outbound body
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new AuraValidationError(
        `Outbound validation failed for POST ${path}`,
        parseResult.error.issues,
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionId) {
      headers["x-aura-session-id"] = sessionId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(`${this.endpoint}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(parseResult.data),
        signal: controller.signal,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `POST ${path} failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const responseBody = await response.json();

      if (responseSchema) {
        const responseParseResult = responseSchema.safeParse(responseBody);
        if (!responseParseResult.success) {
          console.warn(
            `Inbound validation failed for POST ${path}:`,
            responseParseResult.error.issues,
          );
          return null;
        }
        return responseParseResult.data;
      }

      return responseBody as TRes;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send a GET request with validated response body.
   *
   * @param path - URL path appended to the endpoint
   * @param responseSchema - Zod schema to validate inbound response
   * @param sessionId - Optional session ID added as header
   * @returns Parsed response body, or `null` for 404 / inbound validation failure
   * @throws Error on non-200/404 responses or network errors
   */
  async get<TRes>(
    path: string,
    responseSchema: ZodSchema<TRes>,
    sessionId?: string,
  ): Promise<TRes | null> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers["x-aura-session-id"] = sessionId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(`${this.endpoint}${path}`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `GET ${path} failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const responseBody = await response.json();

      const responseParseResult = responseSchema.safeParse(responseBody);
      if (!responseParseResult.success) {
        console.warn(
          `Inbound validation failed for GET ${path}:`,
          responseParseResult.error.issues,
        );
        return null;
      }

      return responseParseResult.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
