import React, { useState } from "react";
import type { ProfileAttribute, DataClass, ProfileProvenance } from "@aura/protocol";
import { DataClassSchema, ProfileProvenanceSchema } from "@aura/protocol";

export interface ProfileSimulatorProps {
  onApplyScenario: (attribute: ProfileAttribute) => void;
  onClearScenario: () => void;
  simulatedAttributes: ProfileAttribute[];
}

interface FormErrors {
  confidence?: string;
  dataClass?: string;
}

const DATA_CLASS_OPTIONS: readonly DataClass[] = DataClassSchema.options;
const PROVENANCE_OPTIONS: readonly ProfileProvenance[] = ProfileProvenanceSchema.options;

/**
 * ProfileSimulator allows developers to define temporary ProfileAttribute scenarios
 * for local-only simulation. Simulated attributes are NOT persisted to the server.
 *
 * - Form inputs: key, value, provenance, confidence, dataClass
 * - Validates confidence is in [0, 1] and dataClass is recognized
 * - Displays currently applied simulated attributes
 * - Clear scenario functionality to remove all simulated attributes
 */
export function ProfileSimulator({
  onApplyScenario,
  onClearScenario,
  simulatedAttributes,
}: ProfileSimulatorProps): React.ReactElement {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [provenance, setProvenance] = useState<ProfileProvenance>("explicit");
  const [confidence, setConfidence] = useState("0.8");
  const [dataClass, setDataClass] = useState<string>(DATA_CLASS_OPTIONS[0]);
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    const confidenceNum = parseFloat(confidence);
    if (isNaN(confidenceNum) || confidenceNum < 0 || confidenceNum > 1) {
      newErrors.confidence = "Confidence must be a number between 0 and 1";
    }
    const validDataClasses: readonly string[] = DATA_CLASS_OPTIONS;
    if (!validDataClasses.includes(dataClass)) {
      newErrors.dataClass = `Unrecognized data class: "${dataClass}"`;
    }
    return newErrors;
  }

  function handleApply(): void {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    let parsedValue: unknown = value;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // Keep as string if not valid JSON
    }

    const attribute: ProfileAttribute = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      key,
      value: parsedValue,
      provenance,
      confidence: parseFloat(confidence),
      dataClass: dataClass as DataClass,
    };

    onApplyScenario(attribute);

    // Reset form
    setKey("");
    setValue("");
    setProvenance("explicit");
    setConfidence("0.8");
    setDataClass(DATA_CLASS_OPTIONS[0]);
    setErrors({});
  }

  return (
    <section style={styles.container} aria-label="Profile Simulator">
      <h2 style={styles.heading}>Profile Simulator</h2>
      <p style={styles.localOnlyNotice} data-testid="local-only-notice">
        🧪 Local-only simulation — attributes are not persisted to the server
      </p>

      <div style={styles.form} role="form" aria-label="Add simulated attribute">
        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="ps-key">
            Key
          </label>
          <input
            id="ps-key"
            style={styles.input}
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. preferredLanguage"
            data-testid="ps-key-input"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="ps-value">
            Value (text or JSON)
          </label>
          <input
            id="ps-value"
            style={styles.input}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='e.g. "en" or {"theme":"dark"}'
            data-testid="ps-value-input"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="ps-provenance">
            Provenance
          </label>
          <select
            id="ps-provenance"
            style={styles.select}
            value={provenance}
            onChange={(e) => setProvenance(e.target.value as ProfileProvenance)}
            data-testid="ps-provenance-select"
          >
            {PROVENANCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="ps-confidence">
            Confidence (0–1)
          </label>
          <input
            id="ps-confidence"
            style={{
              ...styles.input,
              ...(errors.confidence ? styles.inputError : {}),
            }}
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={confidence}
            onChange={(e) => {
              setConfidence(e.target.value);
              if (errors.confidence) {
                setErrors((prev) => ({ ...prev, confidence: undefined }));
              }
            }}
            aria-invalid={!!errors.confidence}
            aria-describedby={errors.confidence ? "ps-confidence-error" : undefined}
            data-testid="ps-confidence-input"
          />
          {errors.confidence && (
            <span
              id="ps-confidence-error"
              style={styles.errorText}
              role="alert"
              data-testid="ps-confidence-error"
            >
              {errors.confidence}
            </span>
          )}
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="ps-dataclass">
            Data Class
          </label>
          <select
            id="ps-dataclass"
            style={{
              ...styles.select,
              ...(errors.dataClass ? styles.inputError : {}),
            }}
            value={dataClass}
            onChange={(e) => {
              setDataClass(e.target.value);
              if (errors.dataClass) {
                setErrors((prev) => ({ ...prev, dataClass: undefined }));
              }
            }}
            aria-invalid={!!errors.dataClass}
            aria-describedby={errors.dataClass ? "ps-dataclass-error" : undefined}
            data-testid="ps-dataclass-select"
          >
            {DATA_CLASS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.dataClass && (
            <span
              id="ps-dataclass-error"
              style={styles.errorText}
              role="alert"
              data-testid="ps-dataclass-error"
            >
              {errors.dataClass}
            </span>
          )}
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            style={styles.applyButton}
            onClick={handleApply}
            data-testid="ps-apply-button"
          >
            Apply Scenario
          </button>
          <button
            type="button"
            style={styles.clearButton}
            onClick={onClearScenario}
            data-testid="ps-clear-button"
          >
            Clear Scenario
          </button>
        </div>
      </div>

      {simulatedAttributes.length > 0 && (
        <div style={styles.simulatedSection} data-testid="ps-simulated-list">
          <h3 style={styles.subheading}>
            Applied Simulated Attributes ({simulatedAttributes.length})
          </h3>
          <div style={styles.attrList}>
            {simulatedAttributes.map((attr) => (
              <div key={attr.id} style={styles.attrCard} data-testid="ps-simulated-attr">
                <div style={styles.attrHeader}>
                  <span style={styles.attrKey}>{attr.key}</span>
                  <span style={styles.simulatedBadge}>🧪 Simulated</span>
                </div>
                <dl style={styles.dl}>
                  <dt style={styles.dt}>Value</dt>
                  <dd style={styles.dd}>
                    {typeof attr.value === "object"
                      ? JSON.stringify(attr.value)
                      : String(attr.value ?? "")}
                  </dd>
                  <dt style={styles.dt}>Provenance</dt>
                  <dd style={styles.dd}>{attr.provenance}</dd>
                  <dt style={styles.dt}>Confidence</dt>
                  <dd style={styles.dd}>{(attr.confidence * 100).toFixed(0)}%</dd>
                  <dt style={styles.dt}>Data Class</dt>
                  <dd style={styles.dd}>{attr.dataClass}</dd>
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#fafafa",
  },
  heading: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    fontWeight: 600,
  },
  localOnlyNotice: {
    margin: "0 0 12px 0",
    fontSize: "12px",
    color: "#6a1b9a",
    backgroundColor: "#f3e5f5",
    border: "1px solid #ce93d8",
    borderRadius: "4px",
    padding: "6px 10px",
    fontStyle: "italic",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#333",
  },
  input: {
    padding: "6px 10px",
    fontSize: "13px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    outline: "none",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#c5221f",
    backgroundColor: "#fef7f6",
  },
  select: {
    padding: "6px 10px",
    fontSize: "13px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    outline: "none",
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: "11px",
    color: "#c5221f",
    marginTop: "2px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  applyButton: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#6a1b9a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  clearButton: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#6a1b9a",
    backgroundColor: "#fff",
    border: "1px solid #ce93d8",
    borderRadius: "4px",
    cursor: "pointer",
  },
  simulatedSection: {
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid #e0e0e0",
  },
  subheading: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    fontWeight: 600,
    color: "#333",
  },
  attrList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  attrCard: {
    border: "1px solid #ce93d8",
    borderRadius: "6px",
    padding: "10px",
    backgroundColor: "#f3e5f5",
  },
  attrHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  attrKey: {
    fontWeight: "bold",
    color: "#1a1a1a",
    fontSize: "14px",
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
};
