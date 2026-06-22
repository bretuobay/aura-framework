import React, { useState } from "react";
import type { PrescriptionEntry, RuleMatchRecord, PrescriptionAudit } from "../schema";
import type { ExplanationRecord } from "@aura/protocol";
import type { ConsentProfile, CapabilityManifest } from "@aura/protocol";

export interface PrescriptionInspectorProps {
  prescription: PrescriptionEntry;
  ruleMatches: RuleMatchRecord[];
  explanation: ExplanationRecord | null;
  consentProfile: ConsentProfile;
  manifest: CapabilityManifest;
  audit?: PrescriptionAudit;
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
  section: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#ffffff",
    marginBottom: "12px",
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
  factorsList: {
    listStyle: "disc" as const,
    margin: "4px 0 0 16px",
    padding: 0,
    fontSize: "12px",
  },
  factorItem: {
    marginBottom: "2px",
    color: "#333",
  },
  pipelineStages: {
    listStyle: "none" as const,
    margin: 0,
    padding: 0,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "6px",
  },
  pipelineStage: {
    padding: "8px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#f9f9f9",
  },
  pipelineStageFailed: {
    border: "1px solid #f5c6cb",
    backgroundColor: "#fef7f6",
    color: "#c5221f",
  },
  pipelineStagePassed: {
    border: "1px solid #a8dab5",
    backgroundColor: "#f0faf4",
    color: "#1b7340",
  },
  unavailable: {
    color: "#666",
    fontStyle: "italic" as const,
    fontSize: "12px",
    padding: "8px 0",
  },
  consentTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "12px",
    marginTop: "4px",
  },
  tableTh: {
    textAlign: "left" as const,
    padding: "4px 8px",
    borderBottom: "1px solid #e0e0e0",
    fontWeight: 500 as const,
    color: "#555",
    backgroundColor: "#f5f5f5",
  },
  tableTd: {
    padding: "4px 8px",
    borderBottom: "1px solid #f0f0f0",
    color: "#1a1a1a",
    fontFamily: "monospace",
    fontSize: "11px",
  },
  grantedCell: {
    color: "#1b7340",
    fontWeight: 500 as const,
  },
  deniedCell: {
    color: "#c5221f",
    fontWeight: 500 as const,
  },
  presentCell: {
    color: "#1b7340",
    fontWeight: 500 as const,
  },
  missingCell: {
    color: "#c5221f",
    fontWeight: 500 as const,
  },
  ruleList: {
    listStyle: "none" as const,
    margin: 0,
    padding: 0,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "8px",
  },
  ruleEntry: {
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#fafafa",
  },
  ruleHeader: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
    marginBottom: "4px",
  },
  ruleId: {
    fontFamily: "monospace",
    fontSize: "12px",
    fontWeight: 500 as const,
    color: "#1a1a1a",
  },
  matchedBadge: {
    display: "inline-block",
    padding: "1px 6px",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: 500 as const,
  },
  matchedTrue: {
    backgroundColor: "#e6f4ea",
    color: "#1b7340",
    border: "1px solid #a8dab5",
  },
  matchedFalse: {
    backgroundColor: "#fce8e6",
    color: "#c5221f",
    border: "1px solid #f5c6cb",
  },
  toggleButton: {
    background: "none",
    border: "none",
    padding: "2px 6px",
    fontSize: "11px",
    color: "#1565c0",
    cursor: "pointer",
    textDecoration: "underline" as const,
  },
  conditionTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "12px",
    marginTop: "6px",
  },
  failureReason: {
    fontSize: "12px",
    marginTop: "6px",
    padding: "6px 8px",
    borderRadius: "4px",
    backgroundColor: "#fff3e0",
    color: "#e65100",
    border: "1px solid #ffcc80",
  },
  tag: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "11px",
    backgroundColor: "#e3f2fd",
    color: "#1565c0",
    border: "1px solid #90caf9",
    marginRight: "4px",
    marginBottom: "4px",
  },
  layoutBox: {
    display: "grid" as const,
    gridTemplateColumns: "auto 1fr" as const,
    gap: "4px 12px",
    fontSize: "12px",
  },
} as const;

const PIPELINE_STAGES = [
  "Rule Evaluation",
  "Consent Gate",
  "Manifest Check",
  "Risk-Class Enforcement",
  "Context-Lock Check",
] as const;

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

function identifyRejectingStage(reason?: string): string | null {
  if (!reason) return null;
  const lower = reason.toLowerCase();
  if (lower.includes("rule")) return "Rule Evaluation";
  if (lower.includes("consent")) return "Consent Gate";
  if (lower.includes("manifest")) return "Manifest Check";
  if (lower.includes("risk")) return "Risk-Class Enforcement";
  if (lower.includes("context") || lower.includes("stale")) return "Context-Lock Check";
  // Default to first stage if we can't identify
  return "Rule Evaluation";
}

export function PrescriptionInspector({
  prescription,
  ruleMatches,
  explanation,
  consentProfile,
  manifest,
  audit,
}: PrescriptionInspectorProps): React.ReactElement {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Find the surface referenced by the prescription
  const surface = manifest.surfaces.find((s) => s.surfaceId === prescription.surfaceId);

  // Determine data classes used by the prescription's components from manifest
  const dataClassesForPrescription: string[] = [];
  if (surface) {
    for (const component of surface.components) {
      if (component.constraints?.requiresConsent) {
        for (const dc of component.constraints.requiresConsent) {
          if (!dataClassesForPrescription.includes(dc)) {
            dataClassesForPrescription.push(dc);
          }
        }
      }
    }
    if (surface.consentRequirements) {
      for (const dc of surface.consentRequirements) {
        if (!dataClassesForPrescription.includes(dc)) {
          dataClassesForPrescription.push(dc);
        }
      }
    }
  }
  // Also include dataClassesUsed from audit if available
  if (audit?.dataClassesUsed) {
    for (const dc of audit.dataClassesUsed) {
      if (!dataClassesForPrescription.includes(dc)) {
        dataClassesForPrescription.push(dc);
      }
    }
  }

  return (
    <section style={styles.container} aria-label="Prescription inspector">
      <h2 style={styles.heading}>Prescription Inspector</h2>

      {/* Prescription Header */}
      <div style={styles.section}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {prescription.id}
          </span>
          <span style={getDispositionBadgeStyle(prescription.disposition)}>
            {prescription.disposition}
          </span>
        </div>
        <div style={styles.metaGrid}>
          <span style={styles.metaLabel}>Surface</span>
          <span style={styles.metaValue}>{prescription.surfaceId}</span>
          <span style={styles.metaLabel}>Mode</span>
          <span style={styles.metaValue}>{prescription.mode}</span>
          <span style={styles.metaLabel}>Risk Class</span>
          <span style={styles.metaValue}>{prescription.riskClass}</span>
          <span style={styles.metaLabel}>Manifest Version</span>
          <span style={styles.metaValue}>{prescription.manifestVersion}</span>
          <span style={styles.metaLabel}>Context Lock</span>
          <span style={styles.metaValue}>
            seq {prescription.contextLock.sequenceId} at {prescription.contextLock.capturedAt}
          </span>
          <span style={styles.metaLabel}>Disposition Time</span>
          <span style={styles.metaValue}>{prescription.dispositionTimestamp}</span>
        </div>
      </div>

      {/* Disposition-specific section */}
      {prescription.disposition === "accepted" && (
        <div style={styles.section}>
          <h3 style={styles.sectionHeading}>Explanation</h3>
          {explanation === null ? (
            <p style={styles.unavailable}>Explanation not available</p>
          ) : (
            <div>
              <div style={styles.metaGrid}>
                <span style={styles.metaLabel}>Summary</span>
                <span style={styles.metaValue}>{explanation.summary}</span>
                <span style={styles.metaLabel}>Confidence</span>
                <span style={styles.metaValue}>{(explanation.confidence * 100).toFixed(1)}%</span>
                <span style={styles.metaLabel}>User Visible</span>
                <span style={styles.metaValue}>{explanation.userVisible ? "Yes" : "No"}</span>
              </div>
              {explanation.factors.length > 0 && (
                <>
                  <div
                    style={{
                      ...styles.metaLabel,
                      marginTop: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    Factors
                  </div>
                  <ul style={styles.factorsList}>
                    {explanation.factors.map((factor, idx) => (
                      <li key={idx} style={styles.factorItem}>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {prescription.disposition === "rejected" && (
        <div style={styles.section}>
          <h3 style={styles.sectionHeading}>Pipeline Stages</h3>
          <ul style={styles.pipelineStages}>
            {(() => {
              const rejectingStage = identifyRejectingStage(prescription.rejectionReason);
              let rejectingStageReached = false;
              return PIPELINE_STAGES.map((stage) => {
                if (rejectingStageReached) {
                  return (
                    <li key={stage} style={styles.pipelineStage}>
                      {stage} — <em>not reached</em>
                    </li>
                  );
                }
                if (stage === rejectingStage) {
                  rejectingStageReached = true;
                  return (
                    <li
                      key={stage}
                      style={{
                        ...styles.pipelineStage,
                        ...styles.pipelineStageFailed,
                      }}
                    >
                      ✗ {stage} — rejected: {prescription.rejectionReason || "unknown"}
                    </li>
                  );
                }
                return (
                  <li
                    key={stage}
                    style={{
                      ...styles.pipelineStage,
                      ...styles.pipelineStagePassed,
                    }}
                  >
                    ✓ {stage} — passed
                  </li>
                );
              });
            })()}
          </ul>
        </div>
      )}

      {prescription.disposition === "dropped" && (
        <div style={styles.section}>
          <h3 style={styles.sectionHeading}>Drop Reason</h3>
          <div style={styles.metaGrid}>
            <span style={styles.metaLabel}>Reason</span>
            <span style={styles.metaValue}>{prescription.dropReason || "unknown"}</span>
            {prescription.dropReason === "stale context" && (
              <>
                <span style={styles.metaLabel}>Prescription Seq ID</span>
                <span style={styles.metaValue}>{prescription.contextLock.sequenceId}</span>
                <span style={styles.metaLabel}>Current Seq ID</span>
                <span style={styles.metaValue}>
                  {prescription.currentContextSequenceId ?? "N/A"}
                </span>
              </>
            )}
            {prescription.expiresAt && (
              <>
                <span style={styles.metaLabel}>Expires At</span>
                <span style={styles.metaValue}>{prescription.expiresAt}</span>
              </>
            )}
            {prescription.replacedBy && (
              <>
                <span style={styles.metaLabel}>Replaced By</span>
                <span style={styles.metaValue}>{prescription.replacedBy}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rule Matches Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionHeading}>Rule Matches</h3>
        {ruleMatches.length === 0 ? (
          <p style={styles.unavailable}>No rule evaluation recorded</p>
        ) : (
          <ul style={styles.ruleList}>
            {ruleMatches.map((match) => {
              const expandKey = `${match.prescriptionId}-${match.ruleId}`;
              const isExpanded = expandedRules.has(expandKey);
              return (
                <li key={match.ruleId} style={styles.ruleEntry}>
                  <div style={styles.ruleHeader}>
                    <span style={styles.ruleId}>{match.ruleId}</span>
                    <span
                      style={{
                        ...styles.matchedBadge,
                        ...(match.matched ? styles.matchedTrue : styles.matchedFalse),
                      }}
                    >
                      {match.matched ? "✓ matched" : "✗ not matched"}
                    </span>
                    <button
                      style={styles.toggleButton}
                      onClick={() => toggleExpanded(expandKey)}
                      aria-expanded={isExpanded}
                      aria-label={`Toggle conditions for rule ${match.ruleId}`}
                      type="button"
                    >
                      {isExpanded ? "Hide conditions" : "Show conditions"}
                    </button>
                  </div>

                  {isExpanded && match.conditionResults.length > 0 && (
                    <table
                      style={styles.conditionTable}
                      aria-label={`Conditions for rule ${match.ruleId}`}
                    >
                      <thead>
                        <tr>
                          <th style={styles.tableTh}>Path</th>
                          <th style={styles.tableTh}>Operator</th>
                          <th style={styles.tableTh}>Expected</th>
                          <th style={styles.tableTh}>Passed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.conditionResults.map((condition, idx) => (
                          <tr key={idx}>
                            <td style={styles.tableTd}>{condition.path}</td>
                            <td style={styles.tableTd}>{condition.operator}</td>
                            <td style={styles.tableTd}>{JSON.stringify(condition.expected)}</td>
                            <td
                              style={{
                                ...styles.tableTd,
                                ...(condition.passed ? styles.grantedCell : styles.deniedCell),
                              }}
                            >
                              {condition.passed ? "✓" : "✗"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {!match.matched && match.failureReason && (
                    <div style={styles.failureReason}>Failure: {match.failureReason}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Consent Gate Results */}
      <div style={styles.section}>
        <h3 style={styles.sectionHeading}>Consent Gate</h3>
        {dataClassesForPrescription.length === 0 ? (
          <p style={styles.unavailable}>No consent requirements for this prescription</p>
        ) : (
          <table style={styles.consentTable} aria-label="Consent gate results">
            <thead>
              <tr>
                <th style={styles.tableTh}>Data Class</th>
                <th style={styles.tableTh}>Consent</th>
              </tr>
            </thead>
            <tbody>
              {dataClassesForPrescription.map((dc) => {
                const granted = consentProfile[dc as keyof ConsentProfile] === true;
                return (
                  <tr key={dc}>
                    <td style={styles.tableTd}>{dc}</td>
                    <td
                      style={{
                        ...styles.tableTd,
                        ...(granted ? styles.grantedCell : styles.deniedCell),
                      }}
                    >
                      {granted ? "✓ granted" : "✗ denied"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Manifest Check Results */}
      <div style={styles.section}>
        <h3 style={styles.sectionHeading}>Manifest Check</h3>
        <table style={styles.consentTable} aria-label="Manifest check results">
          <thead>
            <tr>
              <th style={styles.tableTh}>Check</th>
              <th style={styles.tableTh}>Value</th>
              <th style={styles.tableTh}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tableTd}>Surface</td>
              <td style={styles.tableTd}>{prescription.surfaceId}</td>
              <td
                style={{
                  ...styles.tableTd,
                  ...(surface ? styles.presentCell : styles.missingCell),
                }}
              >
                {surface ? "✓ present" : "✗ missing"}
              </td>
            </tr>
            {surface &&
              surface.components.map((component) => (
                <React.Fragment key={component.componentId}>
                  <tr>
                    <td style={styles.tableTd}>Component</td>
                    <td style={styles.tableTd}>{component.componentId}</td>
                    <td style={{ ...styles.tableTd, ...styles.presentCell }}>✓ present</td>
                  </tr>
                  {component.variants.map((variant) => (
                    <tr key={`${component.componentId}-${variant}`}>
                      <td style={{ ...styles.tableTd, paddingLeft: "24px" }}>Variant</td>
                      <td style={styles.tableTd}>{variant}</td>
                      <td style={{ ...styles.tableTd, ...styles.presentCell }}>✓ present</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>

      {/* Layout Stability Constraints */}
      {surface?.layoutStability && (
        <div style={styles.section}>
          <h3 style={styles.sectionHeading}>Layout Stability</h3>
          <div style={styles.layoutBox}>
            <span style={styles.metaLabel}>Strategy</span>
            <span style={styles.metaValue}>{surface.layoutStability.strategy}</span>
            {surface.layoutStability.maxDecisionWaitMs !== undefined && (
              <>
                <span style={styles.metaLabel}>Max Decision Wait</span>
                <span style={styles.metaValue}>{surface.layoutStability.maxDecisionWaitMs}ms</span>
              </>
            )}
            {prescription.layoutStabilityBudgetMs !== undefined && (
              <>
                <span style={styles.metaLabel}>Budget</span>
                <span style={styles.metaValue}>{prescription.layoutStabilityBudgetMs}ms</span>
              </>
            )}
            {prescription.elapsedMs !== undefined && (
              <>
                <span style={styles.metaLabel}>Elapsed</span>
                <span style={styles.metaValue}>{prescription.elapsedMs}ms</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Audit Metadata */}
      {audit && (
        <div style={styles.section}>
          <h3 style={styles.sectionHeading}>Audit Metadata</h3>
          <div style={styles.metaGrid}>
            <span style={styles.metaLabel}>Decision Source</span>
            <span style={styles.metaValue}>{audit.decisionSource}</span>
            <span style={styles.metaLabel}>Policy Version</span>
            <span style={styles.metaValue}>{audit.policyVersion}</span>
            <span style={styles.metaLabel}>Data Classes Used</span>
            <span style={styles.metaValue}>
              {audit.dataClassesUsed.length > 0 ? (
                <span>
                  {audit.dataClassesUsed.map((dc) => (
                    <span key={dc} style={styles.tag}>
                      {dc}
                    </span>
                  ))}
                </span>
              ) : (
                "none"
              )}
            </span>
            <span style={styles.metaLabel}>Latency Class</span>
            <span style={styles.metaValue}>{audit.latencyClass}</span>
            {audit.evaluationTimeMs !== undefined && (
              <>
                <span style={styles.metaLabel}>Evaluation Time</span>
                <span style={styles.metaValue}>{audit.evaluationTimeMs}ms</span>
              </>
            )}
            {audit.modelTier !== undefined && (
              <>
                <span style={styles.metaLabel}>Model Tier</span>
                <span style={styles.metaValue}>{audit.modelTier}</span>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
