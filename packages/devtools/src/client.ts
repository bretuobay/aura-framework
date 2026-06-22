import type { ConsentProfile, AuraEvent, ExplanationRecord, ProfileCorrection } from "@aura/protocol";
import { DevtoolsStateSchema } from "./schema";
import type { DevtoolsState } from "./schema";
import {
  DevtoolsSessionNotFoundError,
  DevtoolsRequestError,
  DevtoolsNetworkError,
  DevtoolsValidationError,
} from "./errors";
import { ExplanationRecordSchema } from "@aura/protocol";

/**
 * Configuration for creating a DevtoolsClient instance.
 */
export interface DevtoolsClientConfig {
  /** Base URL of the AURA server (e.g. "http://localhost:3000") */
  endpoint: string;
  /** Session to inspect */
  sessionId: string;
  /** Optional AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Typed HTTP client interface for all devtools data operations.
 */
export interface DevtoolsClient {
  fetchState(): Promise<DevtoolsState>;
  sendConsent(consentPatch: ConsentProfile): Promise<void>;
  sendEvent(event: AuraEvent): Promise<void>;
  sendProfileCorrection(correction: ProfileCorrection): Promise<void>;
  fetchExplanation(prescriptionId: string): Promise<ExplanationRecord | null>;
}

/**
 * Creates a DevtoolsClient instance configured with the given endpoint and session.
 * All methods use native fetch and support AbortSignal for cancellation.
 */
export function createDevtoolsClient(config: DevtoolsClientConfig): DevtoolsClient {
  const { endpoint, sessionId, signal } = config;

  async function fetchState(): Promise<DevtoolsState> {
    let response: Response;
    try {
      response = await fetch(
        `${endpoint}/aura/devtools/state?sessionId=${encodeURIComponent(sessionId)}`,
        { signal }
      );
    } catch (error: unknown) {
      throw new DevtoolsNetworkError(
        `Network error while fetching devtools state: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    if (response.status === 404) {
      throw new DevtoolsSessionNotFoundError(sessionId);
    }

    if (response.status === 400) {
      let message = "Bad request";
      try {
        const body = await response.json();
        message = body.error || message;
      } catch {
        // Use default message if body parsing fails
      }
      throw new DevtoolsRequestError(400, message);
    }

    if (!response.ok) {
      let message = `Server error: ${response.status}`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch {
        // Use default message if body parsing fails
      }
      throw new DevtoolsRequestError(response.status, message);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error: unknown) {
      throw new DevtoolsNetworkError(
        `Failed to parse response body as JSON: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    const parseResult = DevtoolsStateSchema.safeParse(json);
    if (!parseResult.success) {
      const validationErrors = parseResult.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      throw new DevtoolsValidationError(
        "Server response failed schema validation",
        validationErrors
      );
    }

    return parseResult.data;
  }

  async function sendConsent(consentPatch: ConsentProfile): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${endpoint}/aura/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, consentPatch }),
        signal,
      });
    } catch (error: unknown) {
      throw new DevtoolsNetworkError(
        `Network error while sending consent: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    if (!response.ok) {
      let message = `Consent request failed: ${response.status}`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch {
        // Use default message if body parsing fails
      }
      throw new DevtoolsRequestError(response.status, message);
    }
  }

  async function sendEvent(event: AuraEvent): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${endpoint}/aura/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, events: [event] }),
        signal,
      });
    } catch (error: unknown) {
      throw new DevtoolsNetworkError(
        `Network error while sending event: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    if (!response.ok) {
      let message = `Event request failed: ${response.status}`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch {
        // Use default message if body parsing fails
      }
      throw new DevtoolsRequestError(response.status, message);
    }
  }

  async function sendProfileCorrection(correction: ProfileCorrection): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${endpoint}/aura/profile/correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, correction }),
        signal,
      });
    } catch (error: unknown) {
      throw new DevtoolsNetworkError(
        `Network error while sending profile correction: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    if (!response.ok) {
      let message = `Profile correction request failed: ${response.status}`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch {
        // Use default message if body parsing fails
      }
      throw new DevtoolsRequestError(response.status, message);
    }
  }

  async function fetchExplanation(prescriptionId: string): Promise<ExplanationRecord | null> {
    let response: Response;
    try {
      response = await fetch(
        `${endpoint}/aura/explain/${encodeURIComponent(prescriptionId)}`,
        { signal }
      );
    } catch (error: unknown) {
      throw new DevtoolsNetworkError(
        `Network error while fetching explanation: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let message = `Explanation request failed: ${response.status}`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch {
        // Use default message if body parsing fails
      }
      throw new DevtoolsRequestError(response.status, message);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error: unknown) {
      throw new DevtoolsNetworkError(
        `Failed to parse explanation response as JSON: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }

    // The explain endpoint wraps the record in { explanation: ... }
    const body = json as Record<string, unknown>;
    const data = body.explanation ?? json;

    const parseResult = ExplanationRecordSchema.safeParse(data);
    if (!parseResult.success) {
      const validationErrors = parseResult.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      throw new DevtoolsValidationError(
        "Explanation response failed schema validation",
        validationErrors
      );
    }

    return parseResult.data;
  }

  return {
    fetchState,
    sendConsent,
    sendEvent,
    sendProfileCorrection,
    fetchExplanation,
  };
}
