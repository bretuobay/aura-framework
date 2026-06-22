import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrescriptionLogView } from "../../../src/components/PrescriptionLogView";
import type { PrescriptionEntry } from "../../../src/schema";

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

describe("PrescriptionLogView", () => {
  it("renders empty state when no prescriptions", () => {
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );
    expect(screen.getByText("No prescriptions recorded")).toBeTruthy();
  });

  it("displays prescription id, surfaceId, mode, riskClass, manifestVersion, contextLock.sequenceId, disposition, and dispositionTimestamp", () => {
    const rx = makePrescription({
      id: "rx-test-123",
      surfaceId: "dashboard-main",
      mode: "supervised",
      riskClass: "medium",
      manifestVersion: "2.1.0",
      contextLock: { sequenceId: 7, capturedAt: "2024-01-15T10:30:00.000Z" },
      disposition: "accepted",
      dispositionTimestamp: "2024-02-01T12:00:00.000Z",
    });
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[rx]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    expect(screen.getByText("rx-test-123")).toBeTruthy();
    expect(screen.getByText("dashboard-main")).toBeTruthy();
    expect(screen.getByText("supervised")).toBeTruthy();
    expect(screen.getByText("medium")).toBeTruthy();
    expect(screen.getByText("2.1.0")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("accepted")).toBeTruthy();
    expect(screen.getByText("2024-02-01T12:00:00.000Z")).toBeTruthy();
  });

  it("visually distinguishes accepted, rejected, and dropped prescriptions", () => {
    const prescriptions = [
      makePrescription({ id: "rx-a", disposition: "accepted" }),
      makePrescription({ id: "rx-r", disposition: "rejected", rejectionReason: "consent revoked" }),
      makePrescription({
        id: "rx-d",
        disposition: "dropped",
        dropReason: "expired before delivery",
      }),
    ];
    const onSelect = vi.fn();
    const { container } = render(
      <PrescriptionLogView
        prescriptions={prescriptions}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    const listItems = container.querySelectorAll("li");
    expect(listItems).toHaveLength(3);

    // Check disposition badges exist
    expect(screen.getByText("accepted")).toBeTruthy();
    expect(screen.getByText("rejected")).toBeTruthy();
    expect(screen.getByText("dropped")).toBeTruthy();
  });

  it("shows adaptation types as tags", () => {
    const rx = makePrescription({
      adaptations: [
        { type: "rank" },
        { type: "componentVariant", target: "Button" },
        { type: "filter" },
      ],
    });
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[rx]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    expect(screen.getByText("rank")).toBeTruthy();
    expect(screen.getByText("componentVariant: Button")).toBeTruthy();
    expect(screen.getByText("filter")).toBeTruthy();
  });

  it("displays rejection reason for rejected prescriptions", () => {
    const rx = makePrescription({
      disposition: "rejected",
      rejectionReason: "consent revoked",
    });
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[rx]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    expect(screen.getByText("Rejected: consent revoked")).toBeTruthy();
  });

  it("displays stale context info for dropped prescriptions with stale context", () => {
    const rx = makePrescription({
      disposition: "dropped",
      dropReason: "stale context",
      contextLock: { sequenceId: 3, capturedAt: "2024-01-15T10:30:00.000Z" },
    });
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[rx]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    // Should show both sequence IDs
    expect(screen.getByText(/prescription sequenceId:\s*3.*session sequenceId:\s*10/)).toBeTruthy();
  });

  it("displays manifest mismatch info for rejected prescriptions", () => {
    const rx = makePrescription({
      disposition: "rejected",
      rejectionReason: "manifest check failed",
      manifestVersion: "1.0.0",
    });
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[rx]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    expect(screen.getByText(/Manifest mismatch.*prescription version: 1\.0\.0/)).toBeTruthy();
  });

  it("calls onSelectPrescription with the prescription id when clicked", () => {
    const rx = makePrescription({ id: "rx-click-me" });
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[rx]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    const entry = screen.getByRole("button", {
      name: /Prescription rx-click-me/,
    });
    fireEvent.click(entry);
    expect(onSelect).toHaveBeenCalledWith("rx-click-me");
  });

  it("calls onSelectPrescription on Enter key press", () => {
    const rx = makePrescription({ id: "rx-key" });
    const onSelect = vi.fn();
    render(
      <PrescriptionLogView
        prescriptions={[rx]}
        sessionContextSequenceId={10}
        onSelectPrescription={onSelect}
      />,
    );

    const entry = screen.getByRole("button", {
      name: /Prescription rx-key/,
    });
    fireEvent.keyDown(entry, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("rx-key");
  });
});
