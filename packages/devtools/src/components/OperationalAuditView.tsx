import React from "react";
import type { OperationalAuditEntry, SecurityAuditRecord } from "../schema";

export interface OperationalAuditViewProps {
  operationalAudit: OperationalAuditEntry[];
  securityAudit: SecurityAuditRecord[];
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
  sectionHeading: {
    margin: "16px 0 8px 0",
    fontSize: "14px",
    fontWeight: 600 as const,
    color: "#333",
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
    backgroundColor: "#ffffff",
  },
  entryAccepted: {
    borderLeft: "4px solid #1b7340",
  },
  entryRejected: {
    borderLeft: "4px solid #c5221f",
  },
  entryDropped: {
    borderLeft: "4px solid #9e9e9e",
  },
  securityEntry: {
    borderLeft: "4px solid #e65100",
    backgroundColor: "#fff8f0",
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
  },
  metaLabel: {
    fontWeight: 500 as const,
    color: "#555",
  },
  metaValue: {
    color: "#1a1a1a",
    wordBreak: "break-all" as const,
  },
  llmSection: {
    marginTop: "8px",
    padding: "8px",
    borderRadius: "4px",
    backgroundColor: "#f3e5f5",
    border: "1px solid #ce93d8",
    fontSize: "12px",
  },
  llmLabel: {
    fontWeight: 500 as const,
    color: "#6a1b9a",
    marginBottom: "4px",
  },
  llmText: {
    color: "#4a148c",
    margin: "2px 0",
  },
  droppedSection: {
    marginTop: "8px",
    padding: "8px",
    borderRadius: "4px",
    backgroundColor: "#fff3e0",
    border: "1px solid #ffcc80",
    fontSize: "12px",
  },
  droppedLabel: {
    fontWeight: 500 as const,
    color: "#e65100",
    marginBottom: "4px",
  },
  droppedText: {
    color: "#bf360c",
    margin: "2px 0",
  },
  dataClassTag: {
    display: "inline-block",
    padding: "1px 5px",
    borderRadius: "3px",
    fontSize: "11px",
    backgroundColor: "#e8eaf6",
    color: "#283593",
    border: "1px solid #9fa8da",
    marginRight: "4px",
    marginBottom: "2px",
  },
  categoryBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 500 as const,
    backgroundColor: "#fff3e0",
    color: "#e65100",
    border: "1px solid #ffcc80",
  },
} as const;

function getDispositionBadgeStyle(disposition: string): React.CSSProperties {
  const base = styles.dispositionBadge as React.CSSProperties;
  switch (disposition) {
    case "accepted":
      return { ...base, ...styles.acceptedBadge };
    case "rejected":
      return { ...base, ...styles.rejectedBadge };
    case "dropped":
      return { ...base, ...styles.droppedBadge };
    default:
      return base;
  }
}

function getEntryStyle(disposition?: string): React.CSSProperties {
  const base = styles.entry as React.CSSProperties;
  switch (disposition) {
    case "accepted":
      return { ...base, ...styles.entryAccepted };
    case "rejected":
      return { ...base, ...styles.entryRejected };
    case "dropped":
      return { ...base, ...styles.entryDropped };
    default:
      return base;
  }
}

export function OperationalAuditView({
  operationalAudit,
  securityAudit,
}: OperationalAuditViewProps): React.ReactElement {
  return (
    <section style={styles.container} aria-label="Operational audit">
      <h2 style={styles.heading}>Operational Audit</h2>

      {/* Operational Audit Section */}
      <h3 style={styles.sectionHeading}>Prescription Attempts</h3>
      {operationalAudit.length === 0 ? (
        <p style={styles.emptyState}>No operational audit entries recorded</p>
      ) : (
        <ul style={styles.list} aria-label="Operational audit entries">
          {operationalAudit.map((entry, index) => (
            <li
              key={entry.prescriptionId ?? `op-${index}`}
              style={getEntryStyle(entry.disposition)}
            >
              <div style={styles.entryHeader}>
                <span style={styles.entryId}>{entry.prescriptionId ?? `Entry ${index + 1}`}</span>
                {entry.disposition && (
                  <span style={getDispositionBadgeStyle(entry.disposition)}>
                    {entry.disposition}
                  </span>
                )}
              </div>

              <div style={styles.metaGrid}>
                {entry.latencyClass && (
                  <>
                    <span style={styles.metaLabel}>Latency Class</span>
                    <span style={styles.metaValue}>{entry.latencyClass}</span>
                  </>
                )}

                {entry.evaluationTimeMs != null && (
                  <>
                    <span style={styles.metaLabel}>Evaluation Time</span>
                    <span style={styles.metaValue}>{entry.evaluationTimeMs}ms</span>
                  </>
                )}

                {entry.decisionSource && (
                  <>
                    <span style={styles.metaLabel}>Decision Source</span>
                    <span style={styles.metaValue}>{entry.decisionSource}</span>
                  </>
                )}

                {entry.policyVersion && (
                  <>
                    <span style={styles.metaLabel}>Policy Version</span>
                    <span style={styles.metaValue}>{entry.policyVersion}</span>
                  </>
                )}

                {entry.manifestVersion && (
                  <>
                    <span style={styles.metaLabel}>Manifest Version</span>
                    <span style={styles.metaValue}>{entry.manifestVersion}</span>
                  </>
                )}
              </div>

              {entry.dataClassesUsed && entry.dataClassesUsed.length > 0 && (
                <div style={{ marginTop: "6px" }}>
                  <span
                    style={{
                      ...styles.metaLabel,
                      fontSize: "12px",
                      marginRight: "8px",
                    }}
                  >
                    Data Classes:
                  </span>
                  {entry.dataClassesUsed.map((dc) => (
                    <span key={dc} style={styles.dataClassTag}>
                      {dc}
                    </span>
                  ))}
                </div>
              )}

              {/* LLM-specific fields (Req 13a.3) */}
              {entry.decisionSource === "llm" && (
                <div style={styles.llmSection}>
                  <div style={styles.llmLabel}>LLM Decision Details</div>
                  {entry.llmJustification && (
                    <p style={styles.llmText}>
                      <strong>Justification:</strong> {entry.llmJustification}
                    </p>
                  )}
                  <p style={styles.llmText}>
                    <strong>Cloud Model Consent:</strong>{" "}
                    {entry.cloudModelConsentGranted === true
                      ? "Granted"
                      : entry.cloudModelConsentGranted === false
                        ? "Denied"
                        : "Unknown"}
                  </p>
                </div>
              )}

              {/* Dropped prescription details (Req 13a.4) */}
              {entry.disposition === "dropped" && (
                <div style={styles.droppedSection}>
                  <div style={styles.droppedLabel}>Drop Details</div>
                  {entry.budgetMs != null && (
                    <p style={styles.droppedText}>
                      <strong>Budget:</strong> {entry.budgetMs}ms
                    </p>
                  )}
                  {entry.elapsedMs != null && (
                    <p style={styles.droppedText}>
                      <strong>Elapsed:</strong> {entry.elapsedMs}ms
                    </p>
                  )}
                  {entry.dropReason && (
                    <p style={styles.droppedText}>
                      <strong>Reason:</strong> {entry.dropReason}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Security Audit Section */}
      <h3 style={styles.sectionHeading}>Security Audit</h3>
      {securityAudit.length === 0 ? (
        <p style={styles.emptyState}>No security audit records</p>
      ) : (
        <ul style={styles.list} aria-label="Security audit entries">
          {securityAudit.map((record) => (
            <li key={record.id} style={{ ...styles.entry, ...styles.securityEntry }}>
              <div style={styles.entryHeader}>
                <span style={styles.entryId}>{record.id}</span>
                <span style={styles.categoryBadge}>{record.category}</span>
              </div>

              <div style={styles.metaGrid}>
                <span style={styles.metaLabel}>Reason</span>
                <span style={styles.metaValue}>{record.reason}</span>

                <span style={styles.metaLabel}>Timestamp</span>
                <span style={styles.metaValue}>
                  <time dateTime={record.timestamp}>{record.timestamp}</time>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
