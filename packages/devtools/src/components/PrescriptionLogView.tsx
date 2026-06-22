import React from "react";
import type { PrescriptionEntry } from "../schema";

export interface PrescriptionLogViewProps {
  prescriptions: PrescriptionEntry[];
  sessionContextSequenceId: number;
  onSelectPrescription: (prescriptionId: string) => void;
}

const styles = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#fafafa",
  },
  heading: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    fontWeight: 600 as const,
  },
  emptyState: {
    color: "#666",
    fontStyle: "italic" as const,
    padding: "12px 0",
  },
  list: {
    listStyle: "none" as const,
    margin: 0,
    padding: 0,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "8px",
  },
  entry: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  entryAccepted: {
    borderLeft: "4px solid #1b7340",
    backgroundColor: "#f0faf4",
  },
  entryRejected: {
    borderLeft: "4px solid #c5221f",
    backgroundColor: "#fef7f6",
  },
  entryDropped: {
    borderLeft: "4px solid #9e9e9e",
    backgroundColor: "#f5f5f5",
  },
  entryHeader: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: "8px",
  },
  entryId: {
    fontWeight: 500 as const,
    fontSize: "13px",
    color: "#1a1a1a",
    fontFamily: "monospace",
  },
  dispositionBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 500 as const,
    textTransform: "uppercase" as const,
  },
  acceptedBadge: {
    backgroundColor: "#e6f4ea",
    color: "#1b7340",
    border: "1px solid #a8dab5",
  },
  rejectedBadge: {
    backgroundColor: "#fce8e6",
    color: "#c5221f",
    border: "1px solid #f5c6cb",
  },
  droppedBadge: {
    backgroundColor: "#eeeeee",
    color: "#616161",
    border: "1px solid #bdbdbd",
  },
  metaGrid: {
    display: "grid" as const,
    gridTemplateColumns: "auto 1fr" as const,
    gap: "4px 12px",
    fontSize: "12px",
    marginBottom: "8px",
  },
  metaLabel: {
    fontWeight: 500 as const,
    color: "#555",
  },
  metaValue: {
    color: "#1a1a1a",
    wordBreak: "break-all" as const,
  },
  adaptationsRow: {
    display: "flex" as const,
    flexWrap: "wrap" as const,
    gap: "4px",
    marginTop: "6px",
  },
  adaptationTag: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "11px",
    backgroundColor: "#e3f2fd",
    color: "#1565c0",
    border: "1px solid #90caf9",
  },
  reasonText: {
    fontSize: "12px",
    marginTop: "6px",
    padding: "6px 8px",
    borderRadius: "4px",
    backgroundColor: "#fff3e0",
    color: "#e65100",
    border: "1px solid #ffcc80",
  },
  staleContextText: {
    fontSize: "12px",
    marginTop: "6px",
    padding: "6px 8px",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    color: "#616161",
    border: "1px solid #e0e0e0",
  },
} as const;

function getDispositionBadgeStyle(disposition: string): React.CSSProperties {
  switch (disposition) {
    case "accepted":
      return { ...styles.dispositionBadge, ...styles.acceptedBadge };
    case "rejected":
      return { ...styles.dispositionBadge, ...styles.rejectedBadge };
    case "dropped":
      return { ...styles.dispositionBadge, ...styles.droppedBadge };
    default:
      return styles.dispositionBadge;
  }
}

function getEntryStyle(disposition: string): React.CSSProperties {
  switch (disposition) {
    case "accepted":
      return { ...styles.entry, ...styles.entryAccepted };
    case "rejected":
      return { ...styles.entry, ...styles.entryRejected };
    case "dropped":
      return { ...styles.entry, ...styles.entryDropped };
    default:
      return styles.entry;
  }
}

export function PrescriptionLogView({
  prescriptions,
  sessionContextSequenceId,
  onSelectPrescription,
}: PrescriptionLogViewProps): React.ReactElement {
  if (prescriptions.length === 0) {
    return (
      <section style={styles.container} aria-label="Prescription log">
        <h2 style={styles.heading}>Prescription Log</h2>
        <p style={styles.emptyState}>No prescriptions recorded</p>
      </section>
    );
  }

  return (
    <section style={styles.container} aria-label="Prescription log">
      <h2 style={styles.heading}>Prescription Log</h2>
      <ul style={styles.list}>
        {prescriptions.map((rx) => (
          <li
            key={rx.id}
            style={getEntryStyle(rx.disposition)}
            onClick={() => onSelectPrescription(rx.id)}
            role="button"
            tabIndex={0}
            aria-label={`Prescription ${rx.id} - ${rx.disposition}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPrescription(rx.id);
              }
            }}
          >
            <div style={styles.entryHeader}>
              <span style={styles.entryId}>{rx.id}</span>
              <span style={getDispositionBadgeStyle(rx.disposition)}>{rx.disposition}</span>
            </div>

            <div style={styles.metaGrid}>
              <span style={styles.metaLabel}>Surface</span>
              <span style={styles.metaValue}>{rx.surfaceId}</span>

              <span style={styles.metaLabel}>Mode</span>
              <span style={styles.metaValue}>{rx.mode}</span>

              <span style={styles.metaLabel}>Risk Class</span>
              <span style={styles.metaValue}>{rx.riskClass}</span>

              <span style={styles.metaLabel}>Manifest Version</span>
              <span style={styles.metaValue}>{rx.manifestVersion}</span>

              <span style={styles.metaLabel}>Context Seq ID</span>
              <span style={styles.metaValue}>{rx.contextLock.sequenceId}</span>

              <span style={styles.metaLabel}>Disposition Time</span>
              <span style={styles.metaValue}>
                <time dateTime={rx.dispositionTimestamp}>{rx.dispositionTimestamp}</time>
              </span>
            </div>

            <div style={styles.adaptationsRow}>
              {rx.adaptations.map((adaptation, idx) => (
                <span key={idx} style={styles.adaptationTag}>
                  {adaptation.type}
                  {adaptation.target ? `: ${adaptation.target}` : ""}
                </span>
              ))}
            </div>

            {rx.disposition === "rejected" && rx.rejectionReason && (
              <div style={styles.reasonText}>Rejected: {rx.rejectionReason}</div>
            )}

            {rx.disposition === "dropped" && rx.dropReason === "stale context" && (
              <div style={styles.staleContextText}>
                Stale context — prescription sequenceId: {rx.contextLock.sequenceId}, session
                sequenceId: {sessionContextSequenceId}
              </div>
            )}

            {rx.disposition === "rejected" && rx.rejectionReason === "manifest check failed" && (
              <div style={styles.reasonText}>
                Manifest mismatch — prescription version: {rx.manifestVersion}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
