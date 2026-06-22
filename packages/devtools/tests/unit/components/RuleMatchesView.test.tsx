import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RuleMatchesView } from "../../../src/components/RuleMatchesView";
import type { RuleMatchRecord, PrescriptionEntry } from "../../../src/schema";

function makePrescription(overrides: Partial<PrescriptionEntry> = {}): PrescriptionEntry {
  return {
    id: "rx-001",
    surfaceId: "surface-main",
    mode: "autonomous",
    riskClass: "low",
    manifestVersion: "1.0.0",
    contextLock: {
      sequenceId: 5,
      capturedAt: "2024-01-15T10:30:00.000Z",
    },
    disposition: "accepted",
    dispositionTimestamp: "2024-01-15T10:30:01.000Z",
    adaptations: [{ type: "rank" }],
    ...overrides,
  };
}

function makeRuleMatch(overrides: Partial<RuleMatchRecord> = {}): RuleMatchRecord {
  return {
    ruleId: "rule-001",
    prescriptionId: "rx-001",
    matched: true,
    conditionResults: [
      {
        path: "profile.theme",
        operator: "equals",
        expected: "dark",
        passed: true,
      },
    ],
    ...overrides,
  };
}

describe("RuleMatchesView", () => {
  it("renders all rule match entries grouped by prescription", () => {
    const prescriptions = [makePrescription({ id: "rx-001" }), makePrescription({ id: "rx-002" })];
    const ruleMatches = [
      makeRuleMatch({ ruleId: "rule-a", prescriptionId: "rx-001" }),
      makeRuleMatch({ ruleId: "rule-b", prescriptionId: "rx-001" }),
      makeRuleMatch({ ruleId: "rule-c", prescriptionId: "rx-002" }),
    ];
    const onNav = vi.fn();
    render(
      <RuleMatchesView
        ruleMatches={ruleMatches}
        prescriptions={prescriptions}
        onNavigateToPrescription={onNav}
      />,
    );

    expect(screen.getByText("Prescription: rx-001")).toBeTruthy();
    expect(screen.getByText("Prescription: rx-002")).toBeTruthy();
    expect(screen.getByText("rule-a")).toBeTruthy();
    expect(screen.getByText("rule-b")).toBeTruthy();
    expect(screen.getByText("rule-c")).toBeTruthy();
  });

  it("displays ruleId and matched boolean for each rule", () => {
    const prescriptions = [makePrescription({ id: "rx-001" })];
    const ruleMatches = [
      makeRuleMatch({ ruleId: "rule-pass", matched: true, prescriptionId: "rx-001" }),
      makeRuleMatch({ ruleId: "rule-fail", matched: false, prescriptionId: "rx-001" }),
    ];
    const onNav = vi.fn();
    render(
      <RuleMatchesView
        ruleMatches={ruleMatches}
        prescriptions={prescriptions}
        onNavigateToPrescription={onNav}
      />,
    );

    expect(screen.getByText("rule-pass")).toBeTruthy();
    expect(screen.getByText("✓ matched")).toBeTruthy();
    expect(screen.getByText("rule-fail")).toBeTruthy();
    expect(screen.getByText("✗ not matched")).toBeTruthy();
  });

  it("shows per-condition breakdown when expanded", () => {
    const prescriptions = [makePrescription({ id: "rx-001" })];
    const ruleMatches = [
      makeRuleMatch({
        ruleId: "rule-001",
        prescriptionId: "rx-001",
        conditionResults: [
          { path: "profile.theme", operator: "equals", expected: "dark", passed: true },
          { path: "profile.fontSize", operator: "gte", expected: 16, passed: false },
        ],
      }),
    ];
    const onNav = vi.fn();
    render(
      <RuleMatchesView
        ruleMatches={ruleMatches}
        prescriptions={prescriptions}
        onNavigateToPrescription={onNav}
      />,
    );

    // Conditions table should not be visible before expanding
    expect(screen.queryByText("profile.theme")).toBeNull();

    // Click expand
    const toggleBtn = screen.getByLabelText("Toggle conditions for rule rule-001");
    fireEvent.click(toggleBtn);

    // Now conditions should be visible
    expect(screen.getByText("profile.theme")).toBeTruthy();
    expect(screen.getByText("equals")).toBeTruthy();
    expect(screen.getByText('"dark"')).toBeTruthy();
    expect(screen.getByText("profile.fontSize")).toBeTruthy();
    expect(screen.getByText("gte")).toBeTruthy();
    expect(screen.getByText("16")).toBeTruthy();
  });

  it("displays failureReason for non-matching rules", () => {
    const prescriptions = [makePrescription({ id: "rx-001" })];
    const ruleMatches = [
      makeRuleMatch({
        ruleId: "rule-fail",
        prescriptionId: "rx-001",
        matched: false,
        failureReason: "Context attribute missing: profile.theme",
      }),
    ];
    const onNav = vi.fn();
    render(
      <RuleMatchesView
        ruleMatches={ruleMatches}
        prescriptions={prescriptions}
        onNavigateToPrescription={onNav}
      />,
    );

    expect(screen.getByText("Failure: Context attribute missing: profile.theme")).toBeTruthy();
  });

  it("shows placeholder for prescriptions with no rule evaluation", () => {
    const prescriptions = [
      makePrescription({ id: "rx-001" }),
      makePrescription({ id: "rx-no-rules" }),
    ];
    const ruleMatches = [makeRuleMatch({ ruleId: "rule-a", prescriptionId: "rx-001" })];
    const onNav = vi.fn();
    render(
      <RuleMatchesView
        ruleMatches={ruleMatches}
        prescriptions={prescriptions}
        onNavigateToPrescription={onNav}
      />,
    );

    expect(screen.getByText("No rule evaluation recorded")).toBeTruthy();
  });

  it("calls onNavigateToPrescription when prescription header is clicked", () => {
    const prescriptions = [makePrescription({ id: "rx-nav-test" })];
    const ruleMatches = [makeRuleMatch({ prescriptionId: "rx-nav-test" })];
    const onNav = vi.fn();
    render(
      <RuleMatchesView
        ruleMatches={ruleMatches}
        prescriptions={prescriptions}
        onNavigateToPrescription={onNav}
      />,
    );

    const header = screen.getByText("Prescription: rx-nav-test");
    fireEvent.click(header);
    expect(onNav).toHaveBeenCalledWith("rx-nav-test");
  });

  it("does not show failureReason when rule matched", () => {
    const prescriptions = [makePrescription({ id: "rx-001" })];
    const ruleMatches = [
      makeRuleMatch({
        ruleId: "rule-ok",
        prescriptionId: "rx-001",
        matched: true,
        failureReason: "Should not show",
      }),
    ];
    const onNav = vi.fn();
    render(
      <RuleMatchesView
        ruleMatches={ruleMatches}
        prescriptions={prescriptions}
        onNavigateToPrescription={onNav}
      />,
    );

    expect(screen.queryByText("Failure: Should not show")).toBeNull();
  });
});
