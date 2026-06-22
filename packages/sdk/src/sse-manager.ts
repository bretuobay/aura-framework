import { UIPrescriptionSchema } from "@aura/protocol";
import type { UIPrescription } from "@aura/protocol";
import { AuraClientError, ErrorCodes } from "./errors.js";

/**
 * Options for configuring the SSEManager.
 */
export interface SSEManagerOptions {
  /** Base URL of the AURA server (e.g. "https://api.example.com") */
  endpoint: string;
  /** Session ID to include as a query parameter on the SSE stream URL */
  sessionId: string;
  /** Callback invoked with a validated UIPrescription on each valid SSE message */
  onMessage: (prescription: UIPrescription) => void;
  /** Callback invoked with an AuraClientError on connection errors or invalid messages */
  onError: (error: AuraClientError) => void;
}

/**
 * Computes the reconnection delay for a given attempt using exponential backoff.
 *
 * Formula: min(2^(attempt - 1) * 1000, 30000)
 * Sequence: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
 *
 * @param attempt - The 1-based reconnection attempt number
 * @returns Delay in milliseconds
 */
export function getBackoffDelay(attempt: number): number {
  return Math.min(Math.pow(2, attempt - 1) * 1000, 30000);
}

/**
 * SSEManager manages an EventSource connection to the AURA prescription stream.
 *
 * It handles:
 * - Opening/closing the EventSource connection
 * - Parsing and validating incoming messages through UIPrescriptionSchema
 * - Exponential backoff reconnection on connection errors
 * - Stopping reconnection only on explicit disconnect()
 */
export class SSEManager {
  private readonly endpoint: string;
  private readonly sessionId: string;
  private readonly onMessage: (prescription: UIPrescription) => void;
  private readonly onError: (error: AuraClientError) => void;

  private eventSource: EventSource | null = null;
  private connected = false;
  private disconnected = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: SSEManagerOptions) {
    this.endpoint = options.endpoint;
    this.sessionId = options.sessionId;
    this.onMessage = options.onMessage;
    this.onError = options.onError;
  }

  /**
   * Opens the EventSource connection to the prescription stream.
   * Handles message parsing, validation, error handling, and reconnection.
   */
  connect(): void {
    // If explicitly disconnected, do nothing
    if (this.disconnected) {
      return;
    }

    // Close any existing connection before opening a new one
    this.closeEventSource();

    const url = `${this.endpoint}/aura/prescriptions/stream?sessionId=${encodeURIComponent(this.sessionId)}`;

    const es = new EventSource(url);
    this.eventSource = es;

    es.onopen = () => {
      this.connected = true;
      // Reset backoff counter on successful connection
      this.reconnectAttempt = 0;
    };

    es.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    es.onerror = () => {
      this.connected = false;

      // Notify about connection loss
      this.onError(
        new AuraClientError(
          "SSE connection lost",
          ErrorCodes.SSE_CONNECTION_LOST,
          { endpoint: this.endpoint, sessionId: this.sessionId },
        ),
      );

      // Close the current EventSource
      this.closeEventSource();

      // Attempt reconnection unless explicitly disconnected
      this.scheduleReconnect();
    };
  }

  /**
   * Disconnects the EventSource and stops all reconnection attempts.
   * After calling disconnect(), the manager will not reconnect.
   */
  disconnect(): void {
    this.disconnected = true;
    this.connected = false;

    // Clear any pending reconnection timeout
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close the EventSource
    this.closeEventSource();
  }

  /**
   * Returns whether the SSE connection is currently open and active.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Computes the reconnection delay for a given attempt.
   * Exposed as an instance method for testability (Property 21).
   */
  getBackoffDelay(attempt: number): number {
    return getBackoffDelay(attempt);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Handles an incoming SSE message event.
   * Parses the data as JSON, validates through UIPrescriptionSchema,
   * and either invokes onMessage or onError accordingly.
   */
  private handleMessage(event: MessageEvent): void {
    let parsed: unknown;

    try {
      parsed = JSON.parse(event.data as string);
    } catch {
      // JSON parse failure — invalid message
      this.onError(
        new AuraClientError(
          "Failed to parse SSE message as JSON",
          ErrorCodes.PRESCRIPTION_INVALID,
          { rawData: event.data },
        ),
      );
      return;
    }

    const result = UIPrescriptionSchema.safeParse(parsed);

    if (result.success) {
      this.onMessage(result.data);
    } else {
      // Schema validation failure — discard and report
      this.onError(
        new AuraClientError(
          "SSE message failed UIPrescription schema validation",
          ErrorCodes.PRESCRIPTION_INVALID,
          {
            issues: result.error.issues,
            rawData: event.data,
          },
        ),
      );
    }
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   * Does nothing if explicitly disconnected.
   */
  private scheduleReconnect(): void {
    if (this.disconnected) {
      return;
    }

    this.reconnectAttempt++;
    const delay = this.getBackoffDelay(this.reconnectAttempt);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      // Don't reconnect if disconnected during the wait
      if (this.disconnected) {
        return;
      }

      // Notify about reconnect attempt
      this.onError(
        new AuraClientError(
          `SSE reconnection attempt ${this.reconnectAttempt} after ${delay}ms`,
          ErrorCodes.SSE_RECONNECT_FAILED,
          {
            attempt: this.reconnectAttempt,
            delay,
            endpoint: this.endpoint,
          },
        ),
      );

      this.connect();
    }, delay);
  }

  /**
   * Closes the current EventSource if it exists and nullifies the reference.
   */
  private closeEventSource(): void {
    if (this.eventSource !== null) {
      this.eventSource.onopen = null;
      this.eventSource.onmessage = null;
      this.eventSource.onerror = null;
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
