import React from "react";
import type { CapabilityManifest, ManifestSurface, ManifestComponent } from "@aura/protocol";

export interface ManifestSummaryViewProps {
  manifest: CapabilityManifest;
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
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#fafafa",
    color: "#666",
    textAlign: "center" as const,
  },
  surfaceCard: {
    marginBottom: "12px",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #d0d0d0",
    backgroundColor: "#fff",
  },
  surfaceHeader: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    fontWeight: 600 as const,
    color: "#333",
  },
  dl: {
    margin: "0 0 8px 0",
    display: "grid" as const,
    gridTemplateColumns: "auto 1fr",
    gap: "4px 12px",
    alignItems: "baseline" as const,
  },
  dt: {
    fontWeight: 500 as const,
    color: "#555",
    fontSize: "12px",
  },
  dd: {
    margin: 0,
    color: "#1a1a1a",
    fontSize: "13px",
  },
  componentsList: {
    listStyle: "none" as const,
    margin: "8px 0 0 0",
    padding: 0,
  },
  componentItem: {
    padding: "8px",
    marginBottom: "6px",
    borderRadius: "4px",
    border: "1px solid #e8e8e8",
    backgroundColor: "#f8f8f8",
  },
  componentHeading: {
    margin: "0 0 4px 0",
    fontSize: "13px",
    fontWeight: 500 as const,
    color: "#444",
  },
  badge: {
    display: "inline-block",
    padding: "1px 6px",
    borderRadius: "3px",
    fontSize: "11px",
    fontWeight: 500 as const,
    marginRight: "4px",
    marginBottom: "2px",
  },
  riskLow: {
    backgroundColor: "#e6f4ea",
    color: "#1b7340",
    border: "1px solid #a8dab5",
  },
  riskMedium: {
    backgroundColor: "#fef7e0",
    color: "#7c5e00",
    border: "1px solid #fdd663",
  },
  riskHigh: {
    backgroundColor: "#fce8e6",
    color: "#c5221f",
    border: "1px solid #f5c6cb",
  },
  riskCritical: {
    backgroundColor: "#f3e0f9",
    color: "#7b1fa2",
    border: "1px solid #ce93d8",
  },
  variantBadge: {
    backgroundColor: "#e3f2fd",
    color: "#1565c0",
    border: "1px solid #90caf9",
  },
  consentBadge: {
    backgroundColor: "#fff3e0",
    color: "#e65100",
    border: "1px solid #ffcc80",
  },
  propsConstraints: {
    fontSize: "12px",
    color: "#555",
    fontStyle: "italic" as const,
    marginTop: "4px",
  },
  componentsLabel: {
    fontSize: "12px",
    fontWeight: 500 as const,
    color: "#666",
    margin: "8px 0 4px 0",
  },
} as const;

function getRiskStyle(riskClass: string): React.CSSProperties {
  switch (riskClass) {
    case "low":
      return { ...styles.badge, ...styles.riskLow };
    case "medium":
      return { ...styles.badge, ...styles.riskMedium };
    case "high":
      return { ...styles.badge, ...styles.riskHigh };
    case "critical":
      return { ...styles.badge, ...styles.riskCritical };
    default:
      return styles.badge;
  }
}

function summarizeAdaptableProps(adaptableProps: Record<string, unknown>): string {
  const entries = Object.entries(adaptableProps);
  if (entries.length === 0) {
    return "No constraints";
  }

  const summaries: string[] = [];
  for (const [key, value] of entries) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const constraint = value as Record<string, unknown>;
      const parts: string[] = [];

      if ("type" in constraint) {
        parts.push(`type: ${String(constraint.type)}`);
      }
      if ("enum" in constraint && Array.isArray(constraint.enum)) {
        parts.push(`values: [${constraint.enum.join(", ")}]`);
      }
      if ("minimum" in constraint) {
        parts.push(`min: ${String(constraint.minimum)}`);
      }
      if ("maximum" in constraint) {
        parts.push(`max: ${String(constraint.maximum)}`);
      }
      if ("minLength" in constraint) {
        parts.push(`minLength: ${String(constraint.minLength)}`);
      }
      if ("maxLength" in constraint) {
        parts.push(`maxLength: ${String(constraint.maxLength)}`);
      }
      if ("pattern" in constraint) {
        parts.push(`pattern: ${String(constraint.pattern)}`);
      }

      if (parts.length > 0) {
        summaries.push(`${key} (${parts.join(", ")})`);
      } else {
        summaries.push(`${key}: constrained`);
      }
    } else {
      summaries.push(`${key}: ${String(value)}`);
    }
  }

  return summaries.join("; ");
}

function ComponentEntry({ component }: { component: ManifestComponent }): React.ReactElement {
  const consentReqs = component.constraints?.requiresConsent;

  return (
    <li style={styles.componentItem} data-testid={`component-${component.componentId}`}>
      <div style={styles.componentHeading}>{component.componentId}</div>
      <dl style={styles.dl}>
        <dt style={styles.dt}>Risk Class</dt>
        <dd style={styles.dd}>
          <span style={getRiskStyle(component.riskClass)}>{component.riskClass}</span>
        </dd>

        <dt style={styles.dt}>Variants</dt>
        <dd style={styles.dd}>
          {component.variants.map((v) => (
            <span key={v} style={{ ...styles.badge, ...styles.variantBadge }}>
              {v}
            </span>
          ))}
        </dd>

        {consentReqs && consentReqs.length > 0 && (
          <>
            <dt style={styles.dt}>Consent Required</dt>
            <dd style={styles.dd}>
              {consentReqs.map((dc) => (
                <span key={dc} style={{ ...styles.badge, ...styles.consentBadge }}>
                  {dc}
                </span>
              ))}
            </dd>
          </>
        )}
      </dl>

      {component.adaptableProps && Object.keys(component.adaptableProps).length > 0 && (
        <div style={styles.propsConstraints} data-testid={`props-${component.componentId}`}>
          Adaptable props: {summarizeAdaptableProps(component.adaptableProps)}
        </div>
      )}
    </li>
  );
}

function SurfaceEntry({ surface }: { surface: ManifestSurface }): React.ReactElement {
  return (
    <article style={styles.surfaceCard} data-testid={`surface-${surface.surfaceId}`}>
      <h3 style={styles.surfaceHeader}>{surface.surfaceId}</h3>
      <dl style={styles.dl}>
        {surface.layoutStability && (
          <>
            <dt style={styles.dt}>Layout Strategy</dt>
            <dd style={styles.dd}>{surface.layoutStability.strategy}</dd>

            {surface.layoutStability.maxDecisionWaitMs !== undefined && (
              <>
                <dt style={styles.dt}>Max Decision Wait</dt>
                <dd style={styles.dd}>{surface.layoutStability.maxDecisionWaitMs}ms</dd>
              </>
            )}
          </>
        )}

        {surface.consentRequirements && surface.consentRequirements.length > 0 && (
          <>
            <dt style={styles.dt}>Surface Consent</dt>
            <dd style={styles.dd}>
              {surface.consentRequirements.map((dc) => (
                <span key={dc} style={{ ...styles.badge, ...styles.consentBadge }}>
                  {dc}
                </span>
              ))}
            </dd>
          </>
        )}
      </dl>

      <div style={styles.componentsLabel}>
        Components ({surface.components.length})
      </div>
      <ul style={styles.componentsList} aria-label={`Components for surface ${surface.surfaceId}`}>
        {surface.components.map((comp) => (
          <ComponentEntry key={comp.componentId} component={comp} />
        ))}
      </ul>
    </article>
  );
}

export function ManifestSummaryView({ manifest }: ManifestSummaryViewProps): React.ReactElement {
  if (manifest.surfaces.length === 0) {
    return (
      <section style={styles.emptyState} aria-label="Manifest summary">
        <h2 style={styles.heading}>Manifest Summary</h2>
        <p style={{ margin: 0 }}>No surfaces declared</p>
      </section>
    );
  }

  const totalComponents = manifest.surfaces.reduce(
    (sum, s) => sum + s.components.length,
    0
  );

  return (
    <section style={styles.container} aria-label="Manifest summary">
      <h2 style={styles.heading}>
        Manifest Summary
        {manifest.version && (
          <span style={{ fontWeight: 400, fontSize: "13px", marginLeft: "8px", color: "#666" }}>
            v{manifest.version}
          </span>
        )}
      </h2>
      <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#666" }}>
        {manifest.surfaces.length} surface{manifest.surfaces.length !== 1 ? "s" : ""},{" "}
        {totalComponents} component{totalComponents !== 1 ? "s" : ""}
      </p>
      <div data-testid="surfaces-list">
        {manifest.surfaces.map((surface) => (
          <SurfaceEntry key={surface.surfaceId} surface={surface} />
        ))}
      </div>
    </section>
  );
}
