import React from "react";
import type { AuraEvent } from "@aura/protocol";

export interface EventLogViewProps {
  events: AuraEvent[];
  replayedEventIds?: Set<string>;
}

/**
 * EventLogView displays all AuraEvent records for the current session.
 *
 * - Shows event type, surfaceId, timestamp, and collapsible payload
 * - Displays total event count at top
 * - Distinguishes replayed events via the replayedEventIds prop
 * - Shows empty-state message when no events recorded
 * - Preserves server-provided ordering without modification
 */
export function EventLogView({ events, replayedEventIds }: EventLogViewProps): React.ReactElement {
  if (events.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyState}>No events recorded</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.count}>Events ({events.length})</span>
      </div>
      <div style={styles.list}>
        {events.map((event, index) => {
          const isReplayed = replayedEventIds?.has(String(index)) ?? false;
          return <EventEntry key={index} event={event} isReplayed={isReplayed} />;
        })}
      </div>
    </div>
  );
}

interface EventEntryProps {
  event: AuraEvent;
  isReplayed: boolean;
}

function EventEntry({ event, isReplayed }: EventEntryProps): React.ReactElement {
  return (
    <div style={styles.entry}>
      <div style={styles.entryHeader}>
        <span style={styles.eventType}>{event.type}</span>
        <span style={styles.surfaceId}>{event.surfaceId}</span>
        <span style={styles.timestamp}>{event.timestamp}</span>
        {isReplayed && <span style={styles.replayedBadge}>replayed</span>}
      </div>
      <details>
        <summary style={styles.payloadToggle}>Payload</summary>
        <pre style={styles.payload}>{JSON.stringify(event.payload, null, 2)}</pre>
      </details>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "monospace",
    fontSize: "13px",
    padding: "8px",
  },
  header: {
    marginBottom: "8px",
    paddingBottom: "4px",
    borderBottom: "1px solid #ddd",
  },
  count: {
    fontWeight: "bold",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  entry: {
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    padding: "8px",
    backgroundColor: "#fafafa",
  },
  entryHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
    flexWrap: "wrap",
  },
  eventType: {
    fontWeight: "bold",
    color: "#1a73e8",
  },
  surfaceId: {
    color: "#555",
  },
  timestamp: {
    color: "#888",
    fontSize: "12px",
  },
  replayedBadge: {
    backgroundColor: "#ff9800",
    color: "#fff",
    fontSize: "11px",
    padding: "1px 6px",
    borderRadius: "3px",
    fontWeight: "bold",
  },
  payloadToggle: {
    cursor: "pointer",
    color: "#666",
    fontSize: "12px",
    userSelect: "none",
  },
  payload: {
    margin: "4px 0 0 0",
    padding: "6px",
    backgroundColor: "#f5f5f5",
    borderRadius: "3px",
    overflow: "auto",
    maxHeight: "200px",
    fontSize: "12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  emptyState: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    padding: "24px",
  },
};
