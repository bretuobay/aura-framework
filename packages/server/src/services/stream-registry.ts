/**
 * StreamRegistry — in-process registry mapping session IDs to active SSE connections.
 *
 * Manages the lifecycle of SSE connections: registration, removal, broadcast,
 * and connection counting. Each session can have multiple concurrent connections
 * (e.g., multiple browser tabs), and broadcasts deliver prescriptions to all of them.
 */

import type { UIPrescription } from "@aura/protocol";

// ─── Public Types ────────────────────────────────────────────────────────────

export interface SSEConnection {
  id: string;
  sessionId: string;
  write(event: string, data: string, id?: string): void;
  close(): void;
}

export interface IStreamRegistry {
  /** Register an SSE connection for a session */
  register(sessionId: string, connection: SSEConnection): void;

  /** Remove a specific connection */
  remove(connectionId: string): void;

  /** Remove all connections for a session */
  removeAll(sessionId: string): void;

  /** Broadcast a prescription to all connections for a session */
  broadcast(sessionId: string, prescription: UIPrescription): void;

  /** Get count of active connections for a session */
  connectionCount(sessionId: string): number;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createStreamRegistry(): IStreamRegistry {
  // Map<sessionId, Map<connectionId, SSEConnection>>
  const registry = new Map<string, Map<string, SSEConnection>>();

  return {
    register(sessionId: string, connection: SSEConnection): void {
      let sessionConnections = registry.get(sessionId);
      if (!sessionConnections) {
        sessionConnections = new Map<string, SSEConnection>();
        registry.set(sessionId, sessionConnections);
      }
      sessionConnections.set(connection.id, connection);
    },

    remove(connectionId: string): void {
      for (const [sessionId, sessionConnections] of registry) {
        if (sessionConnections.has(connectionId)) {
          sessionConnections.delete(connectionId);
          // Clean up empty session entries
          if (sessionConnections.size === 0) {
            registry.delete(sessionId);
          }
          return;
        }
      }
    },

    removeAll(sessionId: string): void {
      registry.delete(sessionId);
    },

    broadcast(sessionId: string, prescription: UIPrescription): void {
      const sessionConnections = registry.get(sessionId);
      if (!sessionConnections) {
        return;
      }
      const data = JSON.stringify(prescription);
      for (const connection of sessionConnections.values()) {
        connection.write("prescription", data, prescription.id);
      }
    },

    connectionCount(sessionId: string): number {
      const sessionConnections = registry.get(sessionId);
      return sessionConnections ? sessionConnections.size : 0;
    },
  };
}
