import React from "react";
import type { SessionMetadata } from "../schema";

export interface SessionSummaryViewProps {
  session: SessionMetadata | null;
  error?: string;
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
  statusBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 500 as const,
  },
  active: {
    backgroundColor: "#e6f4ea",
    color: "#1b7340",
    border: "1px solid #a8dab5",
  },
  rejected: {
    backgroundColor: "#fce8e6",
    color: "#c5221f",
    border: "1px solid #f5c6cb",
  },
  dl: {
    margin: 0,
    display: "grid" as const,
    gridTemplateColumns: "auto 1fr",
    gap: "8px 16px",
    alignItems: "baseline" as const,
  },
  dt: {
    fontWeight: 500 as const,
    color: "#555",
  },
  dd: {
    margin: 0,
    color: "#1a1a1a",
    wordBreak: "break-all" as const,
  },
  errorContainer: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #f5c6cb",
    backgroundColor: "#fce8e6",
    color: "#c5221f",
  },
  errorHeading: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: 600 as const,
  },
} as const;

export function SessionSummaryView({ session, error }: SessionSummaryViewProps): React.ReactElement {
  if (error) {
    return (
      <div style={styles.errorContainer} role="alert" aria-label="Session error">
        <h2 style={styles.errorHeading}>Session Not Found</h2>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.errorContainer} role="alert" aria-label="Session error">
        <h2 style={styles.errorHeading}>Session Not Found</h2>
        <p style={{ margin: 0 }}>No session data available.</p>
      </div>
    );
  }

  const isActive = session.status === "active";
  const badgeStyle = {
    ...styles.statusBadge,
    ...(isActive ? styles.active : styles.rejected),
  };

  return (
    <section style={styles.container} aria-label="Session summary">
      <h2 style={styles.heading}>Session Summary</h2>
      <dl style={styles.dl}>
        <dt style={styles.dt}>Session ID</dt>
        <dd style={styles.dd}>{session.sessionId}</dd>

        <dt style={styles.dt}>User ID</dt>
        <dd style={styles.dd}>{session.userId}</dd>

        <dt style={styles.dt}>Status</dt>
        <dd style={styles.dd}>
          <span style={badgeStyle} data-testid="status-badge">
            {session.status}
          </span>
        </dd>

        <dt style={styles.dt}>Manifest Version</dt>
        <dd style={styles.dd}>
          {session.manifestVersion ?? "unversioned"}
        </dd>

        <dt style={styles.dt}>Context Sequence ID</dt>
        <dd style={styles.dd}>{session.contextSequenceId}</dd>

        <dt style={styles.dt}>Created At</dt>
        <dd style={styles.dd}>
          <time dateTime={session.createdAt}>{session.createdAt}</time>
        </dd>
      </dl>
    </section>
  );
}
