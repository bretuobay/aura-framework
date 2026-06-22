import React, { useState } from "react";
import type { AuraEvent } from "@aura/protocol";

export interface EventReplayerProps {
  fixtureEvents: Array<{ name: string; event: AuraEvent }>;
  onReplay: (event: AuraEvent) => Promise<void>;
  isReplaying: boolean;
}

/**
 * EventReplayer provides two modes for replaying events:
 * 1. Select from a predefined list of fixture events
 * 2. Enter a manual AuraEvent JSON payload
 *
 * On replay, the parent handles the actual POST via DevtoolsClient.sendEvent().
 * Shows loading state during replay and inline error on failure.
 * Does NOT add entries to EventLogView on error.
 */
export function EventReplayer({
  fixtureEvents,
  onReplay,
  isReplaying,
}: EventReplayerProps): React.ReactElement {
  const [mode, setMode] = useState<"fixture" | "manual">("fixture");
  const [selectedFixtureIndex, setSelectedFixtureIndex] = useState<number>(0);
  const [manualPayload, setManualPayload] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleReplayFixture = async () => {
    if (fixtureEvents.length === 0) return;
    setError(null);
    const fixture = fixtureEvents[selectedFixtureIndex];
    try {
      await onReplay(fixture.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay failed");
    }
  };

  const handleReplayManual = async () => {
    setError(null);
    let parsed: AuraEvent;
    try {
      parsed = JSON.parse(manualPayload) as AuraEvent;
    } catch {
      setError("Invalid JSON payload");
      return;
    }
    try {
      await onReplay(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay failed");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Event Replayer</span>
      </div>

      <div style={styles.modeToggle}>
        <button
          type="button"
          style={mode === "fixture" ? styles.modeButtonActive : styles.modeButton}
          onClick={() => { setMode("fixture"); setError(null); }}
          disabled={isReplaying}
        >
          Fixture
        </button>
        <button
          type="button"
          style={mode === "manual" ? styles.modeButtonActive : styles.modeButton}
          onClick={() => { setMode("manual"); setError(null); }}
          disabled={isReplaying}
        >
          Manual
        </button>
      </div>

      {mode === "fixture" && (
        <div style={styles.section}>
          {fixtureEvents.length === 0 ? (
            <p style={styles.emptyState}>No fixture events available</p>
          ) : (
            <>
              <label style={styles.label} htmlFor="fixture-select">
                Select fixture event:
              </label>
              <select
                id="fixture-select"
                style={styles.select}
                value={selectedFixtureIndex}
                onChange={(e) => setSelectedFixtureIndex(Number(e.target.value))}
                disabled={isReplaying}
              >
                {fixtureEvents.map((fixture, index) => (
                  <option key={index} value={index}>
                    {fixture.name}
                  </option>
                ))}
              </select>
              <details style={styles.previewDetails}>
                <summary style={styles.previewSummary}>Preview payload</summary>
                <pre style={styles.preview}>
                  {JSON.stringify(fixtureEvents[selectedFixtureIndex].event, null, 2)}
                </pre>
              </details>
              <button
                type="button"
                style={isReplaying ? styles.replayButtonDisabled : styles.replayButton}
                onClick={handleReplayFixture}
                disabled={isReplaying}
              >
                {isReplaying ? "Replaying…" : "Replay"}
              </button>
            </>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div style={styles.section}>
          <label style={styles.label} htmlFor="manual-payload">
            Enter AuraEvent JSON:
          </label>
          <textarea
            id="manual-payload"
            style={styles.textarea}
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            placeholder='{"type": "surface.viewed", "surfaceId": "...", "timestamp": "...", "payload": {}}'
            disabled={isReplaying}
            rows={8}
          />
          <button
            type="button"
            style={isReplaying ? styles.replayButtonDisabled : styles.replayButton}
            onClick={handleReplayManual}
            disabled={isReplaying || manualPayload.trim() === ""}
          >
            {isReplaying ? "Replaying…" : "Replay"}
          </button>
        </div>
      )}

      {error && (
        <div style={styles.error} role="alert">
          {error}
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
  title: {
    fontWeight: "bold",
  },
  modeToggle: {
    display: "flex",
    gap: "4px",
    marginBottom: "12px",
  },
  modeButton: {
    padding: "4px 12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "12px",
  },
  modeButtonActive: {
    padding: "4px 12px",
    border: "1px solid #1a73e8",
    borderRadius: "4px",
    backgroundColor: "#e8f0fe",
    color: "#1a73e8",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "12px",
    color: "#555",
    fontWeight: "bold",
  },
  select: {
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  previewDetails: {
    marginTop: "4px",
  },
  previewSummary: {
    cursor: "pointer",
    color: "#666",
    fontSize: "12px",
    userSelect: "none" as const,
  },
  preview: {
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
  textarea: {
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "12px",
    fontFamily: "monospace",
    resize: "vertical" as const,
    minHeight: "100px",
  },
  replayButton: {
    padding: "6px 16px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#1a73e8",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    alignSelf: "flex-start",
  },
  replayButtonDisabled: {
    padding: "6px 16px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#ccc",
    color: "#666",
    cursor: "not-allowed",
    fontSize: "12px",
    fontWeight: "bold",
    alignSelf: "flex-start",
  },
  emptyState: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    padding: "24px",
  },
  error: {
    marginTop: "8px",
    padding: "8px",
    borderRadius: "4px",
    backgroundColor: "#fdecea",
    color: "#d32f2f",
    fontSize: "12px",
    border: "1px solid #f5c6cb",
  },
};
