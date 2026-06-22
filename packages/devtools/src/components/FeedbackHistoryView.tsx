import React from "react";
import type { FeedbackEvent } from "@aura/protocol";

export interface FeedbackHistoryViewProps {
  feedbackHistory: FeedbackEvent[];
  onNavigateToPrescription: (prescriptionId: string) => void;
}

/**
 * FeedbackHistoryView displays all FeedbackEvent records for the current session.
 *
 * - Shows prescriptionId (clickable), action, timestamp, and reason (if present)
 * - Displays events in the order provided (ascending timestamp guaranteed by server)
 * - Shows total feedback count at top
 * - Navigation to corresponding prescription via prescriptionId
 * - Empty-state message when no feedback recorded
 */
export function FeedbackHistoryView({
  feedbackHistory,
  onNavigateToPrescription,
}: FeedbackHistoryViewProps): React.ReactElement {
  if (feedbackHistory.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyState}>No feedback recorded</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.count}>Feedback ({feedbackHistory.length})</span>
      </div>
      <div style={styles.list} role="list">
        {feedbackHistory.map((entry, index) => (
          <FeedbackEntry
            key={index}
            entry={entry}
            onNavigateToPrescription={onNavigateToPrescription}
          />
        ))}
      </div>
    </div>
  );
}

interface FeedbackEntryProps {
  entry: FeedbackEvent;
  onNavigateToPrescription: (prescriptionId: string) => void;
}

function FeedbackEntry({
  entry,
  onNavigateToPrescription,
}: FeedbackEntryProps): React.ReactElement {
  return (
    <div style={styles.entry} role="listitem">
      <div style={styles.entryHeader}>
        <button
          type="button"
          style={styles.prescriptionLink}
          onClick={() => onNavigateToPrescription(entry.prescriptionId)}
          aria-label={`Navigate to prescription ${entry.prescriptionId}`}
        >
          {entry.prescriptionId}
        </button>
        <span style={styles.actionBadge} data-action={entry.action}>
          {entry.action}
        </span>
        <span style={styles.timestamp}>{entry.timestamp}</span>
      </div>
      {entry.reason && (
        <div style={styles.reason}>
          <span style={styles.reasonLabel}>Reason:</span> {entry.reason}
        </div>
      )}
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
    flexWrap: "wrap",
  },
  prescriptionLink: {
    background: "none",
    border: "none",
    padding: 0,
    color: "#1a73e8",
    fontFamily: "monospace",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    textDecoration: "underline",
  },
  actionBadge: {
    backgroundColor: "#e8f0fe",
    color: "#1967d2",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    fontWeight: "bold",
  },
  timestamp: {
    color: "#888",
    fontSize: "12px",
  },
  reason: {
    marginTop: "4px",
    color: "#555",
    fontSize: "12px",
  },
  reasonLabel: {
    fontWeight: "bold",
    color: "#333",
  },
  emptyState: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    padding: "24px",
  },
};
