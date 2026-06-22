import React, { useState } from "react";
import type { RuleMatchRecord, PrescriptionEntry } from "../schema";

export interface RuleMatchesViewProps {
  ruleMatches: RuleMatchRecord[];
  prescriptions: PrescriptionEntry[];
  onNavigateToPrescription: (prescriptionId: string) => void;
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
  groupList: {
    listStyle: "none" as const,
    margin: 0,
    padding: 0,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "12px",
  },
  group: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#ffffff",
  },
  groupHeader: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
    marginBottom: "8px",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "13px",
    fontWeight: 500 as const,
    color: "#1565c0",
    fontFamily: "monospace",
    textDecoration: "underline" as const,
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
  conditionTh: {
    textAlign: "left" as const,
    padding: "4px 8px",
    borderBottom: "1px solid #e0e0e0",
    fontWeight: 500 as const,
    color: "#555",
    backgroundColor: "#f5f5f5",
  },
  conditionTd: {
    padding: "4px 8px",
    borderBottom: "1px solid #f0f0f0",
    color: "#1a1a1a",
    fontFamily: "monospace",
    fontSize: "11px",
  },
  passedCell: {
    fontWeight: 500 as const,
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
  noEvalPlaceholder: {
    color: "#666",
    fontStyle: "italic" as const,
    fontSize: "12px",
    padding: "4px 0",
  },
} as const;

export function RuleMatchesView({
  ruleMatches,
  prescriptions,
  onNavigateToPrescription,
}: RuleMatchesViewProps): React.ReactElement {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // Group ruleMatches by prescriptionId
  const matchesByPrescription = new Map<string, RuleMatchRecord[]>();
  for (const match of ruleMatches) {
    const existing = matchesByPrescription.get(match.prescriptionId) || [];
    existing.push(match);
    matchesByPrescription.set(match.prescriptionId, existing);
  }

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

  return (
    <section style={styles.container} aria-label="Rule matches">
      <h2 style={styles.heading}>Rule Matches</h2>
      <ul style={styles.groupList}>
        {prescriptions.map((prescription) => {
          const matches = matchesByPrescription.get(prescription.id) || [];
          return (
            <li key={prescription.id} style={styles.group}>
              <button
                style={styles.groupHeader}
                onClick={() => onNavigateToPrescription(prescription.id)}
                aria-label={`Navigate to prescription ${prescription.id}`}
                type="button"
              >
                Prescription: {prescription.id}
              </button>

              {matches.length === 0 ? (
                <p style={styles.noEvalPlaceholder}>
                  No rule evaluation recorded
                </p>
              ) : (
                <ul style={styles.ruleList}>
                  {matches.map((match) => {
                    const expandKey = `${match.prescriptionId}-${match.ruleId}`;
                    const isExpanded = expandedRules.has(expandKey);
                    return (
                      <li key={match.ruleId} style={styles.ruleEntry}>
                        <div style={styles.ruleHeader}>
                          <span style={styles.ruleId}>{match.ruleId}</span>
                          <span
                            style={{
                              ...styles.matchedBadge,
                              ...(match.matched
                                ? styles.matchedTrue
                                : styles.matchedFalse),
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
                                <th style={styles.conditionTh}>Path</th>
                                <th style={styles.conditionTh}>Operator</th>
                                <th style={styles.conditionTh}>Expected</th>
                                <th style={styles.conditionTh}>Passed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {match.conditionResults.map((condition, idx) => (
                                <tr key={idx}>
                                  <td style={styles.conditionTd}>
                                    {condition.path}
                                  </td>
                                  <td style={styles.conditionTd}>
                                    {condition.operator}
                                  </td>
                                  <td style={styles.conditionTd}>
                                    {JSON.stringify(condition.expected)}
                                  </td>
                                  <td
                                    style={{
                                      ...styles.conditionTd,
                                      ...styles.passedCell,
                                      color: condition.passed
                                        ? "#1b7340"
                                        : "#c5221f",
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
                          <div style={styles.failureReason}>
                            Failure: {match.failureReason}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
