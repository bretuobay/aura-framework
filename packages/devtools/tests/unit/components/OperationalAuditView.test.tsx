import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { OperationalAuditView } from "../../../src/components/OperationalAuditView";
import type { OperationalAuditEntry, SecurityAuditRecord } from "../../../src/schema";

const sampleOperationalEntry: OperationalAuditEntry = {
  prescriptionId: "rx-001",
  latencyClass: "fast",
  evaluationTimeMs: 42,
  decisionSource: "rules",
  policyVersion: "1.0.0",
  manifestVersion: "2.1.0",
  dataClassesUsed: ["behavior", "personalization"],
  disposition: "accepted",
};

const llmEntry: OperationalAuditEntry = {
  prescriptionId: "rx-002",
  latencyClass: "slow",
  evaluationTimeMs: 1200,
  decisionSource: "llm",
  policyVersion: "1.0.0",
  manifestVersion: "2.1.0",
  dataClassesUsed: ["behavior"],
  disposition: "accepted",
  llmJustification: "User behavior pattern suggests preference change",
  cloudModelConsentGranted: true,
};

const droppedEntry: OperationalAuditEntry = {
  prescriptionId: "rx-003",
  latencyClass: "fast",
  evaluationTimeMs: 350,
  decisionSource: "rules",
  policyVersion: "1.0.0",
  manifestVersion: "2.1.0",
  dataClassesUsed: ["behavior"],
  disposition: "dropped",
  budgetMs: 200,
  elapsedMs: 350,
  dropReason: "exceeded layout-stability budget",
};

const sampleSecurityRecord: SecurityAuditRecord = {
  id: "sec-001",
  category: "prompt-injection",
  reason: "Suspicious input pattern detected in event payload",
  timestamp: "2024-06-15T10:30:00.000Z",
};

describe("OperationalAuditView", () => {
  describe("displays one row per entry (Req 13a.1)", () => {
    it("renders one entry per operational audit record", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[sampleOperationalEntry, llmEntry, droppedEntry]}
          securityAudit={[]}
        />
      );

      const opList = container.querySelector('[aria-label="Operational audit entries"]');
      expect(opList).not.toBeNull();
      const items = opList!.querySelectorAll("li");
      expect(items.length).toBe(3);
    });

    it("renders one entry per security audit record", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[]}
          securityAudit={[sampleSecurityRecord, { ...sampleSecurityRecord, id: "sec-002" }]}
        />
      );

      const secList = container.querySelector('[aria-label="Security audit entries"]');
      expect(secList).not.toBeNull();
      const items = secList!.querySelectorAll("li");
      expect(items.length).toBe(2);
    });
  });

  describe("displays operational audit fields (Req 13a.2)", () => {
    it("shows latencyClass, evaluationTime, decisionSource, policyVersion, manifestVersion, and disposition", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[sampleOperationalEntry]}
          securityAudit={[]}
        />
      );

      const text = container.textContent!;
      expect(text).toContain("fast");
      expect(text).toContain("42ms");
      expect(text).toContain("rules");
      expect(text).toContain("1.0.0");
      expect(text).toContain("2.1.0");
      expect(text).toContain("accepted");
    });

    it("shows dataClassesUsed tags", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[sampleOperationalEntry]}
          securityAudit={[]}
        />
      );

      const text = container.textContent!;
      expect(text).toContain("behavior");
      expect(text).toContain("personalization");
    });
  });

  describe("LLM decision source details (Req 13a.3)", () => {
    it("shows LLM justification and consent when decisionSource is llm", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[llmEntry]}
          securityAudit={[]}
        />
      );

      const text = container.textContent!;
      expect(text).toContain("LLM Decision Details");
      expect(text).toContain("User behavior pattern suggests preference change");
      expect(text).toContain("Granted");
    });

    it("does not show LLM section for non-llm decisionSource", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[sampleOperationalEntry]}
          securityAudit={[]}
        />
      );

      const text = container.textContent!;
      expect(text).not.toContain("LLM Decision Details");
    });

    it("shows Denied when cloudModelConsentGranted is false", () => {
      const deniedEntry: OperationalAuditEntry = {
        ...llmEntry,
        cloudModelConsentGranted: false,
      };
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[deniedEntry]}
          securityAudit={[]}
        />
      );

      expect(container.textContent).toContain("Denied");
    });
  });

  describe("dropped prescription details (Req 13a.4)", () => {
    it("shows budget, elapsed, and dropReason for dropped prescriptions", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[droppedEntry]}
          securityAudit={[]}
        />
      );

      const text = container.textContent!;
      expect(text).toContain("Drop Details");
      expect(text).toContain("200ms");
      expect(text).toContain("350ms");
      expect(text).toContain("exceeded layout-stability budget");
    });

    it("does not show drop details for non-dropped prescriptions", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[sampleOperationalEntry]}
          securityAudit={[]}
        />
      );

      expect(container.textContent).not.toContain("Drop Details");
    });
  });

  describe("security audit records (Req 13a.5)", () => {
    it("shows category and sanitized reason", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[]}
          securityAudit={[sampleSecurityRecord]}
        />
      );

      const text = container.textContent!;
      expect(text).toContain("prompt-injection");
      expect(text).toContain("Suspicious input pattern detected in event payload");
      expect(text).toContain("2024-06-15T10:30:00.000Z");
    });

    it("displays the record id", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[]}
          securityAudit={[sampleSecurityRecord]}
        />
      );

      expect(container.textContent).toContain("sec-001");
    });
  });

  describe("empty states", () => {
    it("shows empty message when no operational audit entries exist", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[]}
          securityAudit={[sampleSecurityRecord]}
        />
      );

      expect(container.textContent).toContain("No operational audit entries recorded");
    });

    it("shows empty message when no security audit records exist", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[sampleOperationalEntry]}
          securityAudit={[]}
        />
      );

      expect(container.textContent).toContain("No security audit records");
    });

    it("shows both empty messages when everything is empty", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[]}
          securityAudit={[]}
        />
      );

      expect(container.textContent).toContain("No operational audit entries recorded");
      expect(container.textContent).toContain("No security audit records");
    });
  });

  describe("audit display accuracy (Req 13a.6)", () => {
    it("renders every operational entry from input", () => {
      const entries: OperationalAuditEntry[] = [
        sampleOperationalEntry,
        llmEntry,
        droppedEntry,
      ];
      const { container } = render(
        <OperationalAuditView operationalAudit={entries} securityAudit={[]} />
      );

      const opList = container.querySelector('[aria-label="Operational audit entries"]');
      const items = opList!.querySelectorAll("li");
      expect(items.length).toBe(entries.length);

      expect(container.textContent).toContain("rx-001");
      expect(container.textContent).toContain("rx-002");
      expect(container.textContent).toContain("rx-003");
    });

    it("renders every security record from input", () => {
      const records: SecurityAuditRecord[] = [
        sampleSecurityRecord,
        { id: "sec-002", category: "replay-attack", reason: "Duplicate event detected", timestamp: "2024-06-15T11:00:00.000Z" },
      ];
      const { container } = render(
        <OperationalAuditView operationalAudit={[]} securityAudit={records} />
      );

      const secList = container.querySelector('[aria-label="Security audit entries"]');
      const items = secList!.querySelectorAll("li");
      expect(items.length).toBe(records.length);

      expect(container.textContent).toContain("sec-001");
      expect(container.textContent).toContain("sec-002");
      expect(container.textContent).toContain("replay-attack");
    });
  });

  describe("accessibility", () => {
    it("uses semantic section with aria-label", () => {
      const { container } = render(
        <OperationalAuditView operationalAudit={[]} securityAudit={[]} />
      );

      const section = container.querySelector('[aria-label="Operational audit"]');
      expect(section).not.toBeNull();
    });

    it("uses time elements for security audit timestamps", () => {
      const { container } = render(
        <OperationalAuditView
          operationalAudit={[]}
          securityAudit={[sampleSecurityRecord]}
        />
      );

      const time = container.querySelector("time");
      expect(time).not.toBeNull();
      expect(time!.getAttribute("dateTime")).toBe("2024-06-15T10:30:00.000Z");
    });
  });
});
