import React, { useEffect, useRef, useState, useCallback } from "react";
import type { AuraEvent, DataClass, ExplanationRecord, ProfileAttribute } from "@aura/protocol";
import type { DevtoolsState } from "../schema";
import type { DevtoolsClient } from "../client";
import { createDevtoolsClient } from "../client";
import {
  DevtoolsSessionNotFoundError,
  DevtoolsNetworkError,
  DevtoolsValidationError,
} from "../errors";
import { SessionSummaryView } from "./SessionSummaryView";
import { ManifestSummaryView } from "./ManifestSummaryView";
import { EventLogView } from "./EventLogView";
import { PrescriptionLogView } from "./PrescriptionLogView";
import { RuleMatchesView } from "./RuleMatchesView";
import { ConsentStateView } from "./ConsentStateView";
import { ConsentEditor } from "./ConsentEditor";
import { ProfileAttributesView } from "./ProfileAttributesView";
import { ProfileSimulator } from "./ProfileSimulator";
import { FeedbackHistoryView } from "./FeedbackHistoryView";
import { OperationalAuditView } from "./OperationalAuditView";
import { EventReplayer } from "./EventReplayer";
import { PrescriptionInspector } from "./PrescriptionInspector";

export interface DevtoolsPanelProps {
  /** Base URL of the AURA server */
  endpoint: string;
  /** Session ID to inspect */
  sessionId: string;
  /** Optional fixture events for EventReplayer */
  fixtureEvents?: Array<{ name: string; event: AuraEvent }>;
  /** Optional className for styling */
  className?: string;
}

type TabId =
  | "session"
  | "manifest"
  | "events"
  | "prescriptions"
  | "rules"
  | "consent"
  | "profile"
  | "feedback"
  | "audit"
  | "simulate";

interface TabDefinition {
  id: TabId;
  label: string;
}

const TABS: TabDefinition[] = [
  { id: "session", label: "Session" },
  { id: "manifest", label: "Manifest" },
  { id: "events", label: "Events" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "rules", label: "Rules" },
  { id: "consent", label: "Consent" },
  { id: "profile", label: "Profile" },
  { id: "feedback", label: "Feedback" },
  { id: "audit", label: "Audit" },
  { id: "simulate", label: "Simulate" },
];

interface ErrorState {
  type: "session-not-found" | "network" | "validation" | "request";
  message: string;
  details?: string;
}

function classifyError(error: unknown): ErrorState {
  if (error instanceof DevtoolsSessionNotFoundError) {
    return {
      type: "session-not-found",
      message: `Session not found: ${error.sessionId}`,
    };
  }
  if (error instanceof DevtoolsNetworkError) {
    return {
      type: "network",
      message: "Server unreachable",
      details: error.message,
    };
  }
  if (error instanceof DevtoolsValidationError) {
    return {
      type: "validation",
      message: "Invalid server response",
      details: error.validationErrors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
    };
  }
  if (error instanceof Error) {
    return {
      type: "request",
      message: error.message,
    };
  }
  return {
    type: "request",
    message: String(error),
  };
}

export function DevtoolsPanel({
  endpoint,
  sessionId,
  fixtureEvents = [],
  className,
}: DevtoolsPanelProps): React.ReactElement {
  const [state, setState] = useState<DevtoolsState | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("session");
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayedEventIds, setReplayedEventIds] = useState<Set<string>>(new Set());
  const [simulatedAttributes, setSimulatedAttributes] = useState<ProfileAttribute[]>([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplanationRecord | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const clientRef = useRef<DevtoolsClient | null>(null);

  const fetchState = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    try {
      const newState = await client.fetchState();
      setState(newState);
      setError(null);
    } catch (err: unknown) {
      // Don't set error if aborted
      if (err instanceof Error && err.name === "AbortError") return;
      setError(classifyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const client = createDevtoolsClient({
      endpoint,
      sessionId,
      signal: controller.signal,
    });
    clientRef.current = client;

    setLoading(true);
    setError(null);
    setState(null);
    fetchState();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
      clientRef.current = null;
    };
  }, [endpoint, sessionId, fetchState]);

  // --- Simulation callbacks ---

  const handleConsentToggle = useCallback(
    async (dataClass: DataClass, value: boolean) => {
      const client = clientRef.current;
      if (!client) return;

      await client.sendConsent({ [dataClass]: value });
      await fetchState();
    },
    [fetchState],
  );

  const handleEventReplay = useCallback(
    async (event: AuraEvent) => {
      const client = clientRef.current;
      if (!client) return;

      setIsReplaying(true);
      try {
        await client.sendEvent(event);
        // Track replayed event by index
        setReplayedEventIds((prev) => {
          const next = new Set(prev);
          next.add(String(state?.events.length ?? 0));
          return next;
        });
        await fetchState();
      } finally {
        setIsReplaying(false);
      }
    },
    [fetchState, state?.events.length],
  );

  const handleApplyScenario = useCallback((attribute: ProfileAttribute) => {
    setSimulatedAttributes((prev) => [...prev, attribute]);
  }, []);

  const handleClearScenario = useCallback(() => {
    setSimulatedAttributes([]);
  }, []);

  const handleSelectPrescription = useCallback(async (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setExplanation(null);

    const client = clientRef.current;
    if (!client) return;

    try {
      const result = await client.fetchExplanation(prescriptionId);
      setExplanation(result);
    } catch {
      // Explanation fetch failure is non-fatal; inspector shows "not available"
    }
  }, []);

  const handleNavigateToPrescription = useCallback(
    (prescriptionId: string) => {
      setActiveTab("prescriptions");
      handleSelectPrescription(prescriptionId);
    },
    [handleSelectPrescription],
  );

  // --- Rendering ---

  if (loading) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.loading} role="status" aria-label="Loading">
          Loading devtools state…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.errorPanel} role="alert" aria-label="Devtools error">
          <h2 style={styles.errorHeading}>{error.message}</h2>
          {error.details && <p style={styles.errorDetails}>{error.details}</p>}
          <button
            type="button"
            style={styles.retryButton}
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchState();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={className} style={styles.container}>
        <div style={styles.errorPanel} role="alert">
          <p>No data available.</p>
        </div>
      </div>
    );
  }

  const selectedPrescription = selectedPrescriptionId
    ? (state.prescriptions.find((rx) => rx.id === selectedPrescriptionId) ?? null)
    : null;

  return (
    <div className={className} style={styles.container}>
      <nav style={styles.tabBar} role="tablist" aria-label="Devtools tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            style={activeTab === tab.id ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        style={styles.tabPanel}
      >
        {activeTab === "session" && <SessionSummaryView session={state.session} />}

        {activeTab === "manifest" && <ManifestSummaryView manifest={state.manifest} />}

        {activeTab === "events" && (
          <EventLogView events={state.events} replayedEventIds={replayedEventIds} />
        )}

        {activeTab === "prescriptions" && (
          <>
            <PrescriptionLogView
              prescriptions={state.prescriptions}
              sessionContextSequenceId={state.session.contextSequenceId}
              onSelectPrescription={handleSelectPrescription}
            />
            {selectedPrescription && (
              <div style={styles.inspectorPanel}>
                <PrescriptionInspector
                  prescription={selectedPrescription}
                  ruleMatches={state.ruleMatches.filter(
                    (rm) => rm.prescriptionId === selectedPrescriptionId,
                  )}
                  explanation={explanation}
                  consentProfile={state.consentProfile}
                  manifest={state.manifest}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "rules" && (
          <RuleMatchesView
            ruleMatches={state.ruleMatches}
            prescriptions={state.prescriptions}
            onNavigateToPrescription={handleNavigateToPrescription}
          />
        )}

        {activeTab === "consent" && (
          <>
            <ConsentStateView consentProfile={state.consentProfile} />
            <div style={styles.simToolSpacer}>
              <ConsentEditor consentProfile={state.consentProfile} onToggle={handleConsentToggle} />
            </div>
          </>
        )}

        {activeTab === "profile" && (
          <>
            <ProfileAttributesView
              attributes={state.profileAttributes}
              simulatedAttributes={simulatedAttributes}
            />
            <div style={styles.simToolSpacer}>
              <ProfileSimulator
                onApplyScenario={handleApplyScenario}
                onClearScenario={handleClearScenario}
                simulatedAttributes={simulatedAttributes}
              />
            </div>
          </>
        )}

        {activeTab === "feedback" && (
          <FeedbackHistoryView
            feedbackHistory={state.feedbackHistory}
            onNavigateToPrescription={handleNavigateToPrescription}
          />
        )}

        {activeTab === "audit" && (
          <OperationalAuditView
            operationalAudit={state.operationalAudit}
            securityAudit={state.securityAudit}
          />
        )}

        {activeTab === "simulate" && (
          <EventReplayer
            fixtureEvents={fixtureEvents}
            onReplay={handleEventReplay}
            isReplaying={isReplaying}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    display: "flex",
    flexDirection: "column",
    minHeight: "200px",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px",
    color: "#666",
    fontSize: "14px",
  },
  errorPanel: {
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #f5c6cb",
    backgroundColor: "#fce8e6",
    color: "#c5221f",
  },
  errorHeading: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: 600,
  },
  errorDetails: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    color: "#a3261c",
    wordBreak: "break-word",
  },
  retryButton: {
    padding: "6px 16px",
    borderRadius: "4px",
    border: "1px solid #c5221f",
    backgroundColor: "#fff",
    color: "#c5221f",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
  },
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "2px",
    borderBottom: "2px solid #e0e0e0",
    paddingBottom: "0",
    marginBottom: "16px",
  },
  tab: {
    padding: "8px 14px",
    border: "none",
    borderBottom: "2px solid transparent",
    backgroundColor: "transparent",
    color: "#555",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "-2px",
  },
  tabActive: {
    padding: "8px 14px",
    border: "none",
    borderBottom: "2px solid #1a73e8",
    backgroundColor: "transparent",
    color: "#1a73e8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "-2px",
  },
  tabPanel: {
    flex: 1,
  },
  inspectorPanel: {
    marginTop: "16px",
  },
  simToolSpacer: {
    marginTop: "16px",
  },
};
