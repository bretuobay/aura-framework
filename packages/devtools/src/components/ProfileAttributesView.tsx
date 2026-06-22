import React from "react";
import type { ProfileAttribute } from "@aura/protocol";

export interface ProfileAttributesViewProps {
  attributes: ProfileAttribute[];
  simulatedAttributes?: ProfileAttribute[];
}

/**
 * ProfileAttributesView displays all ProfileAttribute objects for the current session.
 *
 * - Shows key, value, provenance, confidence, dataClass, expiresAt for each attribute
 * - Distinguishes inferred from explicit attributes with label/icon
 * - Low-confidence indicator for attributes with confidence < 0.5
 * - Expired indicator for attributes with expiresAt in the past
 * - Supports simulatedAttributes prop with simulation indicator
 * - Empty-state message when no attributes
 */
export function ProfileAttributesView({
  attributes,
  simulatedAttributes,
}: ProfileAttributesViewProps): React.ReactElement {
  const hasAttributes = attributes.length > 0;
  const hasSimulated = (simulatedAttributes?.length ?? 0) > 0;

  if (!hasAttributes && !hasSimulated) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyState}>No profile attributes recorded</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {hasAttributes && (
        <div>
          <div style={styles.header}>
            <span style={styles.count}>Profile Attributes ({attributes.length})</span>
          </div>
          <div style={styles.list}>
            {attributes.map((attr) => (
              <AttributeCard key={attr.id} attribute={attr} simulated={false} />
            ))}
          </div>
        </div>
      )}
      {hasSimulated && (
        <div style={hasAttributes ? { marginTop: "16px" } : undefined}>
          <div style={styles.header}>
            <span style={styles.count}>Simulated Attributes ({simulatedAttributes!.length})</span>
          </div>
          <div style={styles.list}>
            {simulatedAttributes!.map((attr) => (
              <AttributeCard key={attr.id} attribute={attr} simulated={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AttributeCardProps {
  attribute: ProfileAttribute;
  simulated: boolean;
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function getProvenanceLabel(provenance: string): { icon: string; label: string } {
  switch (provenance) {
    case "inferred":
      return { icon: "🔮", label: "Inferred" };
    case "explicit":
      return { icon: "✓", label: "Explicit" };
    case "imported":
      return { icon: "📥", label: "Imported" };
    default:
      return { icon: "?", label: provenance };
  }
}

function AttributeCard({ attribute, simulated }: AttributeCardProps): React.ReactElement {
  const { key, value, provenance, confidence, dataClass, expiresAt } = attribute;
  const expired = isExpired(expiresAt);
  const lowConfidence = confidence < 0.5;
  const provenanceInfo = getProvenanceLabel(provenance);

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    ...(expired ? styles.cardExpired : {}),
    ...(simulated ? styles.cardSimulated : {}),
  };

  return (
    <div style={cardStyle} data-testid="attribute-card">
      <div style={styles.cardHeader}>
        <span style={styles.key}>{key}</span>
        <div style={styles.badges}>
          {simulated && (
            <span style={styles.simulatedBadge} data-testid="simulated-badge">
              🧪 Simulated
            </span>
          )}
          <span style={getProvenanceBadgeStyle(provenance)} data-testid="provenance-badge">
            {provenanceInfo.icon} {provenanceInfo.label}
          </span>
          {lowConfidence && (
            <span style={styles.lowConfidenceBadge} data-testid="low-confidence-badge">
              ⚠️ Low confidence
            </span>
          )}
          {expired && (
            <span style={styles.expiredBadge} data-testid="expired-badge">
              ⏰ Expired
            </span>
          )}
        </div>
      </div>
      <dl style={styles.dl}>
        <dt style={styles.dt}>Value</dt>
        <dd style={styles.dd}>
          {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
        </dd>

        <dt style={styles.dt}>Confidence</dt>
        <dd style={styles.dd}>
          <span style={lowConfidence ? styles.lowConfidenceText : undefined}>
            {(confidence * 100).toFixed(0)}%
          </span>
        </dd>

        <dt style={styles.dt}>Data Class</dt>
        <dd style={styles.dd}>{dataClass}</dd>

        {expiresAt && (
          <>
            <dt style={styles.dt}>Expires At</dt>
            <dd style={styles.dd}>
              <time dateTime={expiresAt} style={expired ? styles.expiredText : undefined}>
                {expiresAt}
              </time>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function getProvenanceBadgeStyle(provenance: string): React.CSSProperties {
  switch (provenance) {
    case "inferred":
      return styles.inferredBadge;
    case "explicit":
      return styles.explicitBadge;
    case "imported":
      return styles.importedBadge;
    default:
      return styles.inferredBadge;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
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
    fontSize: "14px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    padding: "10px",
    backgroundColor: "#fafafa",
  },
  cardExpired: {
    opacity: 0.7,
    borderColor: "#f5c6cb",
  },
  cardSimulated: {
    borderColor: "#b39ddb",
    backgroundColor: "#f3e5f5",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
    flexWrap: "wrap",
    gap: "4px",
  },
  key: {
    fontWeight: "bold",
    color: "#1a1a1a",
    fontSize: "14px",
  },
  badges: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  inferredBadge: {
    backgroundColor: "#e8eaf6",
    color: "#3949ab",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    fontWeight: 500,
  },
  explicitBadge: {
    backgroundColor: "#e6f4ea",
    color: "#1b7340",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    fontWeight: 500,
  },
  importedBadge: {
    backgroundColor: "#e3f2fd",
    color: "#1565c0",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    fontWeight: 500,
  },
  lowConfidenceBadge: {
    backgroundColor: "#fff3e0",
    color: "#e65100",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    fontWeight: 500,
  },
  expiredBadge: {
    backgroundColor: "#fce8e6",
    color: "#c5221f",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    fontWeight: 500,
  },
  simulatedBadge: {
    backgroundColor: "#f3e5f5",
    color: "#6a1b9a",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    fontWeight: 500,
    border: "1px solid #ce93d8",
  },
  dl: {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "4px 12px",
    alignItems: "baseline",
  },
  dt: {
    fontWeight: 500,
    color: "#555",
    fontSize: "12px",
  },
  dd: {
    margin: 0,
    color: "#1a1a1a",
    wordBreak: "break-word",
  },
  lowConfidenceText: {
    color: "#e65100",
    fontWeight: 500,
  },
  expiredText: {
    color: "#c5221f",
    textDecoration: "line-through",
  },
  emptyState: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    padding: "24px",
  },
};
