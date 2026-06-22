import React, { useState, useCallback } from "react";
import type { ConsentProfile, DataClass } from "@aura/protocol";
import { DataClassSchema } from "@aura/protocol";

export interface ConsentEditorProps {
  consentProfile: ConsentProfile;
  onToggle: (dataClass: DataClass, value: boolean) => Promise<void>;
}

/**
 * All standard DataClass keys from @aura/protocol.
 * Used to render a toggle for every recognized data class.
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
    justifyContent: "space-between" as const,
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
  toggleButton: {
    border: "none",
    borderRadius: "12px",
    width: "40px",
    height: "22px",
    cursor: "pointer",
    position: "relative" as const,
    transition: "background-color 0.2s",
    flexShrink: 0,
  },
  toggleEnabled: {
    backgroundColor: "#1b7340",
  },
  toggleDisabled: {
    backgroundColor: "#c5221f",
  },
  toggleDisabledState: {
    opacity: 0.6,
    cursor: "not-allowed" as const,
  },
  toggleKnob: {
    position: "absolute" as const,
    top: "3px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    transition: "left 0.2s",
  },
  toggleKnobOn: {
    left: "21px",
  },
  toggleKnobOff: {
    left: "3px",
  },
  errorMessage: {
    fontSize: "11px",
    color: "#c5221f",
    marginTop: "4px",
    padding: "2px 4px",
    backgroundColor: "#fce8e6",
    borderRadius: "3px",
  },
  itemWrapper: {
    display: "flex" as const,
    flexDirection: "column" as const,
  },
} as const;

/**
 * ConsentEditor — Simulation tool for toggling DataClass consent values.
 *
 * Renders a toggle switch for each standard DataClass key. When toggled,
 * calls onToggle with the data class and new value. Shows inline error
 * on failure without updating the consent state view.
 */
export function ConsentEditor({
  consentProfile,
  onToggle,
}: ConsentEditorProps): React.ReactElement {
  const [loadingKeys, setLoadingKeys] = useState<Set<DataClass>>(new Set());
  const [errors, setErrors] = useState<Partial<Record<DataClass, string>>>({});

  const handleToggle = useCallback(
    async (dataClass: DataClass) => {
      const currentValue = consentProfile[dataClass] === true;
      const newValue = !currentValue;

      // Clear any previous error for this key
      setErrors((prev) => {
        const next = { ...prev };
        delete next[dataClass];
        return next;
      });

      // Set loading state
      setLoadingKeys((prev) => new Set(prev).add(dataClass));

      try {
        await onToggle(dataClass, newValue);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Toggle failed";
        setErrors((prev) => ({ ...prev, [dataClass]: message }));
      } finally {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(dataClass);
          return next;
        });
      }
    },
    [consentProfile, onToggle],
  );

  return (
    <section style={styles.container} aria-label="Consent editor">
      <h2 style={styles.heading}>Consent Editor</h2>
      <ul style={styles.list} aria-label="Data class consent toggles">
        {STANDARD_DATA_CLASSES.map((dataClass) => {
          const isEnabled = consentProfile[dataClass] === true;
          const isLoading = loadingKeys.has(dataClass);
          const error = errors[dataClass];

          const itemStyle = {
            ...styles.item,
            ...(isEnabled ? styles.enabled : styles.disabled),
          };
          const labelStyle = {
            ...styles.label,
            ...(isEnabled ? styles.enabledLabel : styles.disabledLabel),
          };
          const toggleStyle = {
            ...styles.toggleButton,
            ...(isEnabled ? styles.toggleEnabled : styles.toggleDisabled),
            ...(isLoading ? styles.toggleDisabledState : {}),
          };
          const knobStyle = {
            ...styles.toggleKnob,
            ...(isEnabled ? styles.toggleKnobOn : styles.toggleKnobOff),
          };

          return (
            <li
              key={dataClass}
              style={styles.itemWrapper}
              data-testid={`consent-editor-${dataClass}`}
            >
              <div style={itemStyle}>
                <span style={labelStyle}>{dataClass}</span>
                <button
                  type="button"
                  style={toggleStyle}
                  disabled={isLoading}
                  onClick={() => handleToggle(dataClass)}
                  aria-label={`Toggle ${dataClass} consent (currently ${isEnabled ? "enabled" : "disabled"})`}
                  aria-pressed={isEnabled}
                  data-testid={`consent-toggle-${dataClass}`}
                >
                  <span style={knobStyle} aria-hidden="true" />
                </button>
              </div>
              {error && (
                <span
                  style={styles.errorMessage}
                  role="alert"
                  data-testid={`consent-error-${dataClass}`}
                >
                  {error}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
