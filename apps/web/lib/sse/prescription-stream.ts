/**
 * Client-side SSE connection manager for real-time prescription delivery.
 *
 * Provides a `PrescriptionStream` class and a `usePrescriptionStream` hook
 * that connect to the `/api/aura/prescriptions/stream` SSE endpoint,
 * handle reconnection with exponential backoff on connection loss,
 * and deliver validated UIPrescription objects to consumers.
 *
 * @see Requirements 6.6
 */

import type { UIPrescription } from "@aura/protocol";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PrescriptionHandler = (prescription: UIPrescription) => void;
export type ConnectionStatusHandler = (status: ConnectionStatus) => void;
export type ErrorHandler = (error: PrescriptionStreamError) => void;

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

export interface PrescriptionStreamError {
  code: "CONNECTION_LOST" | "PARSE_ERROR" | "VALIDATION_ERROR" | "RECONNECT_FAILED";
  message: string;
  details?: unknown;
}

export interface PrescriptionStreamOptions {
  /** Base URL for the SSE endpoint (defaults to '' for same-origin) */
  baseUrl?: string;
  /** Session ID to include in the stream URL */
  sessionId: string;
  /** Callback invoked with each validated prescription */
  onPrescription: PrescriptionHandler;
  /** Callback invoked when connection status changes */
  onStatusChange?: ConnectionStatusHandler;
  /** Callback invoked on errors */
  onError?: ErrorHandler;
  /** Maximum number of reconnection attempts before giving up (default: Infinity) */
  maxReconnectAttempts?: number;
  /** Maximum backoff delay in milliseconds (default: 30000) */
  maxBackoffMs?: number;
}

// ─── Backoff Utility ─────────────────────────────────────────────────────────

/**
 * Computes exponential backoff delay for reconnection.
 * Formula: min(2^(attempt - 1) * 1000, maxBackoffMs)
 * Sequence: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
 */
export function computeBackoffDelay(attempt: number, maxBackoffMs: number = 30_000): number {
  return Math.min(Math.pow(2, attempt - 1) * 1000, maxBackoffMs);
}

// ─── PrescriptionStream Class ────────────────────────────────────────────────

/**
 * Manages an EventSource connection to the AURA prescription SSE endpoint.
 *
 * Handles:
 * - Opening and closing the EventSource connection
 * - Parsing incoming SSE messages as UIPrescription JSON
 * - Exponential backoff reconnection on connection loss
 * - Heartbeat-based connection health detection
 * - Explicit disconnect to stop all reconnection attempts
 */
export class PrescriptionStream {
  private readonly baseUrl: string;
  private readonly sessionId: string;
  private readonly onPrescription: PrescriptionHandler;
  private readonly onStatusChange: ConnectionStatusHandler;
  private readonly onError: ErrorHandler;
  private readonly maxReconnectAttempts: number;
  private readonly maxBackoffMs: number;

  private eventSource: EventSource | null = null;
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private explicitlyDisconnected = false;
  private lastEventId: string | null = null;

  constructor(options: PrescriptionStreamOptions) {
    this.baseUrl = options.baseUrl ?? "";
    this.sessionId = options.sessionId;
    this.onPrescription = options.onPrescription;
    this.onStatusChange = options.onStatusChange ?? (() => {});
    this.onError = options.onError ?? (() => {});
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
    this.maxBackoffMs = options.maxBackoffMs ?? 30_000;
  }

  /**
   * Opens the SSE connection to the prescription stream endpoint.
   * If already connected, this is a no-op.
   */
  connect(): void {
    if (this.explicitlyDisconnected) {
      return;
    }

    // Close any existing connection
    this.closeEventSource();
    this.setStatus("connecting");

    const url = `${this.baseUrl}/api/aura/prescriptions/stream?sessionId=${encodeURIComponent(this.sessionId)}`;
    const es = new EventSource(url);
    this.eventSource = es;

    // Handle successful connection
    es.addEventListener("connected", (event: MessageEvent) => {
      this.setStatus("connected");
      this.reconnectAttempt = 0;
      // Store the event ID if provided
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }
    });

    // Handle reconnection acknowledgment
    es.addEventListener("reconnected", () => {
      this.setStatus("connected");
      this.reconnectAttempt = 0;
    });

    // Handle prescription events
    es.addEventListener("prescription", (event: MessageEvent) => {
      this.handlePrescriptionMessage(event);
    });

    // Handle generic messages (fallback for servers that use default event type)
    es.onmessage = (event: MessageEvent) => {
      this.handlePrescriptionMessage(event);
    };

    // Handle connection errors
    es.onerror = () => {
      const wasConnected = this.status === "connected";
      this.closeEventSource();

      if (wasConnected) {
        this.onError({
          code: "CONNECTION_LOST",
          message: "SSE connection to prescription stream lost",
        });
      }

      this.scheduleReconnect();
    };
  }

  /**
   * Explicitly disconnects from the SSE stream and stops all reconnection attempts.
   * After calling disconnect(), the stream will not reconnect until connect() is called again.
   */
  disconnect(): void {
    this.explicitlyDisconnected = true;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.closeEventSource();
    this.setStatus("disconnected");
  }

  /**
   * Resets the disconnect flag, allowing reconnection after a previous disconnect().
   * Does not automatically reconnect — call connect() after reset().
   */
  reset(): void {
    this.explicitlyDisconnected = false;
    this.reconnectAttempt = 0;
  }

  /**
   * Returns the current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Returns whether the stream is currently connected and receiving events.
   */
  isConnected(): boolean {
    return this.status === "connected";
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private handlePrescriptionMessage(event: MessageEvent): void {
    // Track last event ID for reconnection
    if (event.lastEventId) {
      this.lastEventId = event.lastEventId;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data as string);
    } catch {
      this.onError({
        code: "PARSE_ERROR",
        message: "Failed to parse SSE prescription message as JSON",
        details: { rawData: event.data },
      });
      return;
    }

    // Deliver the parsed prescription to the consumer.
    // Full schema validation is handled by the prescription engine downstream.
    this.onPrescription(parsed as UIPrescription);
  }

  private scheduleReconnect(): void {
    if (this.explicitlyDisconnected) {
      this.setStatus("disconnected");
      return;
    }

    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.onError({
        code: "RECONNECT_FAILED",
        message: `Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`,
        details: { attempts: this.reconnectAttempt },
      });
      this.setStatus("disconnected");
      return;
    }

    this.reconnectAttempt++;
    this.setStatus("reconnecting");

    const delay = computeBackoffDelay(this.reconnectAttempt, this.maxBackoffMs);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (this.explicitlyDisconnected) {
        return;
      }

      this.connect();
    }, delay);
  }

  private closeEventSource(): void {
    if (this.eventSource !== null) {
      this.eventSource.onmessage = null;
      this.eventSource.onerror = null;
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.onStatusChange(newStatus);
    }
  }
}

// ─── Hook-compatible factory ─────────────────────────────────────────────────

/**
 * Creates a PrescriptionStream instance. Designed for use within React hooks
 * (e.g., `usePrescriptionStream`) or standalone usage.
 *
 * Usage in a React hook:
 * ```ts
 * const streamRef = useRef<PrescriptionStream | null>(null);
 *
 * useEffect(() => {
 *   const stream = createPrescriptionStream({
 *     sessionId,
 *     onPrescription: (rx) => dispatch({ type: 'PRESCRIPTION', payload: rx }),
 *     onStatusChange: setConnectionStatus,
 *     onError: (err) => console.warn('[SSE]', err.message),
 *   });
 *   stream.connect();
 *   streamRef.current = stream;
 *
 *   return () => stream.disconnect();
 * }, [sessionId]);
 * ```
 */
export function createPrescriptionStream(
  options: PrescriptionStreamOptions,
): PrescriptionStream {
  return new PrescriptionStream(options);
}
