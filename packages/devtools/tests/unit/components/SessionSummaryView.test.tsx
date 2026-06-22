import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SessionSummaryView } from "../../../src/components/SessionSummaryView";
import type { SessionMetadata } from "../../../src/schema";

const activeSession: SessionMetadata = {
  sessionId: "sess-001",
  userId: "user-42",
  status: "active",
  manifestVersion: "1.2.3",
  contextSequenceId: 7,
  createdAt: "2024-06-15T10:30:00.000Z",
};

const rejectedSession: SessionMetadata = {
  sessionId: "sess-002",
  userId: "user-99",
  status: "rejected",
  contextSequenceId: 0,
  createdAt: "2024-06-14T08:00:00.000Z",
};

describe("SessionSummaryView", () => {
  describe("displays session metadata fields (Req 2.1)", () => {
    it("renders sessionId, userId, status, manifestVersion, contextSequenceId, and createdAt", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);
      const text = container.textContent!;

      expect(text).toContain("sess-001");
      expect(text).toContain("user-42");
      expect(text).toContain("active");
      expect(text).toContain("1.2.3");
      expect(text).toContain("7");
      expect(text).toContain("2024-06-15T10:30:00.000Z");
    });
  });

  describe("visual status indicator (Req 2.2)", () => {
    it("shows a green-styled badge for active sessions", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);

      const badge = container.querySelector('[data-testid="status-badge"]') as HTMLElement;
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe("active");
      expect(badge.style.backgroundColor).toBe("rgb(230, 244, 234)");
      expect(badge.style.color).toBe("rgb(27, 115, 64)");
    });

    it("shows a red-styled badge for rejected sessions", () => {
      const { container } = render(<SessionSummaryView session={rejectedSession} />);

      const badge = container.querySelector('[data-testid="status-badge"]') as HTMLElement;
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe("rejected");
      expect(badge.style.backgroundColor).toBe("rgb(252, 232, 230)");
      expect(badge.style.color).toBe("rgb(197, 34, 31)");
    });
  });

  describe("manifest version display (Req 2.3)", () => {
    it("displays the manifest version when present", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);
      expect(container.textContent).toContain("1.2.3");
    });

    it('displays "unversioned" when manifestVersion is undefined', () => {
      const { container } = render(<SessionSummaryView session={rejectedSession} />);
      expect(container.textContent).toContain("unversioned");
    });
  });

  describe("error state for session not found (Req 2.4)", () => {
    it("displays an error message when error prop is provided", () => {
      const { container } = render(
        <SessionSummaryView session={null} error="Session not found: sess-999" />
      );

      expect(container.textContent).toContain("Session Not Found");
      expect(container.textContent).toContain("Session not found: sess-999");
    });

    it("displays a fallback error state when session is null and no error message", () => {
      const { container } = render(<SessionSummaryView session={null} />);

      expect(container.textContent).toContain("Session Not Found");
      expect(container.textContent).toContain("No session data available.");
    });

    it("does not throw or crash the panel", () => {
      expect(() =>
        render(<SessionSummaryView session={null} error="Some error" />)
      ).not.toThrow();
    });

    it("renders a role=alert element for error states", () => {
      const { container } = render(
        <SessionSummaryView session={null} error="Not found" />
      );
      const alert = container.querySelector('[role="alert"]');
      expect(alert).not.toBeNull();
    });
  });

  describe("does not expose internal details (Req 2.5)", () => {
    it("only renders the specified session metadata field labels", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);

      const dtElements = container.querySelectorAll("dt");
      const labels = Array.from(dtElements).map((el) => el.textContent);

      expect(labels).toEqual([
        "Session ID",
        "User ID",
        "Status",
        "Manifest Version",
        "Context Sequence ID",
        "Created At",
      ]);
    });
  });

  describe("display accuracy (Req 2.6)", () => {
    it("rendered values are structurally equal to the session input", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);
      const ddElements = container.querySelectorAll("dd");
      const values = Array.from(ddElements).map((el) => el.textContent);

      expect(values[0]).toBe(activeSession.sessionId);
      expect(values[1]).toBe(activeSession.userId);
      expect(values[2]).toBe(activeSession.status);
      expect(values[3]).toBe(activeSession.manifestVersion);
      expect(values[4]).toBe(String(activeSession.contextSequenceId));
      expect(values[5]).toBe(activeSession.createdAt);
    });
  });

  describe("accessibility", () => {
    it("uses semantic HTML with a section and dl elements", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);

      expect(container.querySelector("section")).not.toBeNull();
      expect(container.querySelector("dl")).not.toBeNull();
      expect(container.querySelectorAll("dt").length).toBe(6);
      expect(container.querySelectorAll("dd").length).toBe(6);
    });

    it("has an aria-label on the section", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);
      const section = container.querySelector('section[aria-label="Session summary"]');
      expect(section).not.toBeNull();
    });

    it("uses a time element for the timestamp", () => {
      const { container } = render(<SessionSummaryView session={activeSession} />);
      const time = container.querySelector("time");
      expect(time).not.toBeNull();
      expect(time!.getAttribute("dateTime")).toBe("2024-06-15T10:30:00.000Z");
    });
  });
});
