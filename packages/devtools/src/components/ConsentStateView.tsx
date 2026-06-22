import React from "react";
import type { ConsentProfile, DataClass } from "@aura/protocol";
import { DataClassSchema } from "@aura/protocol";

export interface ConsentStateViewProps {
  consentProfile: ConsentProfile;
}

/**
 * All standard DataClass keys from @aura/protocol.
 * Used to ensure every key is displayed even when missing from the consent profile.
 */
const STANDARD_DATA_CLASSES: readonly DataClass[] = DataClassSchema.options;

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
  list: {
    listStyle: "none" as const,
    margin: 0,
    padding: 0,
    display: "grid" as const,
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  item: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid",
  },
  enabled: {
    backgroundColor: "#e6f4ea",
    borderColor: "#a8dab5",
  },
  disabled: {
    backgroundColor: "#fce8e6",
    borderColor: "#f5c6cb",
    opacity: 0.85,
  },
  indicator: {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    fontSize: "12px",
    fontWeight: 700 as const,
    flexShrink: 0,
  },
  enabledIndicator: {
    backgroundColor: "#1b7340",
    color: "#fff",
  },
  disabledIndicator: {
    backgroundColor: "#c5221f",
    color: "#fff",
  },
  label: {
    fontSize: "13px",
    fontWeight: 500 as const,
  },
  enabledLabel: {
    color: "#1b7340",
  },
  disabledLabel: {
    color: "#c5221f",
  },
} as const;

export function ConsentStateView({ consentProfile }: ConsentStateViewProps): React.ReactElement {
  return (
    <section style={styles.container} aria-label="Consent state">
      <h2 style={styles.heading}>Consent State</h2>
      <ul style={styles.list} aria-label="Data class consent values">
        {STANDARD_DATA_CLASSES.map((dataClass) => {
          const isEnabled = consentProfile[dataClass] === true;
          const itemStyle = {
            ...styles.item,
            ...(isEnabled ? styles.enabled : styles.disabled),
          };
          const indicatorStyle = {
            ...styles.indicator,
            ...(isEnabled ? styles.enabledIndicator : styles.disabledIndicator),
          };
          const labelStyle = {
            ...styles.label,
            ...(isEnabled ? styles.enabledLabel : styles.disabledLabel),
          };

          return (
            <li
              key={dataClass}
              style={itemStyle}
              data-testid={`consent-${dataClass}`}
              aria-label={`${dataClass}: ${isEnabled ? "enabled" : "disabled"}`}
            >
              <span style={indicatorStyle} aria-hidden="true">
                {isEnabled ? "✓" : "✗"}
              </span>
              <span style={labelStyle}>{dataClass}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
