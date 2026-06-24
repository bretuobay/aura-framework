"use client";

/**
 * DevtoolsOverlay component — a toggleable inspection panel displaying
 * internal AURA state in real time.
 *
 * Panels: Session Info, Event Log (500 max), Prescriptions, User Model,
 * Context Model, Decision Pipeline, Explanations, Feedback History, Manifest Viewer.
 *
 * - Toggleable via header button, persists state while hidden
 * - Updates within 500ms of state changes
 * - New entries visually distinguished for 2 seconds
 * - AI prompts/responses truncated to 2000 chars with expand control
 * - Shows on initial load when SHOW_DEVTOOLS=true
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 11.4, 15.4
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Code, X, ChevronRight } from "lucide-react";
import type { ConsentState } from "@/lib/types/explanation";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DevtoolsEvent {
  type: string;
  timestamp: string;
  payload: unknown;
}

export interface DevtoolsPrescription {
  id: string;
  status: "accepted" | "rejected" | "pending";
  surfaceId: string;
  adaptations: unknown[];
  decisionTier?: "rules" | "slm" | "llm";
  explanation?: string;
  contextLock?: string;
  receivedAt?: string;
}

export interface UserModelAttribute {
  key: string;
  value: unknown;
  provenance: string;
  confidence: number;
  expiresAt?: string;
}

export interface ContextModelData {
  deviceType: string;
  viewportWidth: number;
  viewportHeight: number;
  [key: string]: unknown;
}

export interface FeedbackEntry {
  prescriptionId: string;
  action: "accept" | "dismiss" | "override";
  timestamp: string;
}

export interface AIInteraction {
  prompt: string;
  response: string;
  tier: "slm" | "llm";
  timestamp: string;
}

export interface ManifestData {
  content: unknown;
  validationStatus: "valid" | "invalid" | "pending";
  errors?: string[];
}

export interface DevtoolsOverlayProps {
  isOpen: boolean;
  onToggle: () => void;
  sessionId?: string;
  userId?: string;
  consentState?: ConsentState;
  manifestVersion?: string;
  events?: DevtoolsEvent[];
  prescriptions?: DevtoolsPrescription[];
  userModel?: UserModelAttribute[];
  contextModel?: ContextModelData;
  feedbackHistory?: FeedbackEntry[];
  aiInteractions?: AIInteraction[];
  manifest?: ManifestData;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_EVENTS = 500;
const MAX_AI_DISPLAY_CHARS = 2000;
const NEW_ENTRY_HIGHLIGHT_MS = 2000;

type TabId =
  | "session"
  | "events"
  | "prescriptions"
  | "user-model"
  | "context"
  | "pipeline"
  | "explanations"
  | "feedback"
  | "manifest";

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: "session", label: "Session" },
  { id: "events", label: "Events" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "user-model", label: "User Model" },
  { id: "context", label: "Context" },
  { id: "pipeline", label: "Pipeline" },
  { id: "explanations", label: "Explanations" },
  { id: "feedback", label: "Feedback" },
  { id: "manifest", label: "Manifest" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return iso;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Expandable text block for AI prompts/responses.
 * Truncates at 2000 chars with a "Show more" button. (Req 15.4)
 */
function ExpandableText({ text, label }: { text: string; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > MAX_AI_DISPLAY_CHARS;
  const displayText = expanded ? text : truncateText(text, MAX_AI_DISPLAY_CHARS);

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre className="whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs font-mono text-foreground">
        {displayText}
        {needsTruncation && !expanded && "…"}
      </pre>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-400 underline"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/**
 * Wrapper that highlights new entries for 2 seconds. (Req 8.12)
 */
function HighlightableEntry({
  id,
  newIds,
  children,
}: {
  id: string;
  newIds: Set<string>;
  children: React.ReactNode;
}) {
  const isNew = newIds.has(id);
  return (
    <div
      className={cn(
        "rounded border p-2 transition-colors duration-500",
        isNew
          ? "border-yellow-400 bg-yellow-400/10"
          : "border-border bg-card"
      )}
    >
      {children}
    </div>
  );
}

// ─── Tab Panels ──────────────────────────────────────────────────────────────

function SessionInfoPanel({
  sessionId,
  userId,
  consentState,
  manifestVersion,
}: {
  sessionId?: string;
  userId?: string;
  consentState?: ConsentState;
  manifestVersion?: string;
}) {
  return (
    <div className="space-y-3">
      <InfoRow label="Session ID" value={sessionId ?? "—"} />
      <InfoRow label="User ID" value={userId ?? "—"} />
      <InfoRow
        label="Consent (Behavior)"
        value={consentState?.behavior ? "Granted" : "Revoked"}
      />
      <InfoRow
        label="Consent (Personalization)"
        value={consentState?.personalization ? "Granted" : "Revoked"}
      />
      <InfoRow label="Manifest Version" value={manifestVersion ?? "—"} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground truncate max-w-[200px]">{value}</span>
    </div>
  );
}

function EventLogPanel({
  events,
  newIds,
}: {
  events: DevtoolsEvent[];
  newIds: Set<string>;
}) {
  // Show most recent first, limited to 500 (Req 8.2)
  const displayEvents = events.slice(0, MAX_EVENTS);

  if (displayEvents.length === 0) {
    return <EmptyState message="No events recorded yet." />;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        {displayEvents.length} event{displayEvents.length !== 1 ? "s" : ""} (max {MAX_EVENTS})
      </div>
      {displayEvents.map((event, idx) => {
        const entryId = `event-${event.timestamp}-${idx}`;
        return (
          <HighlightableEntry key={entryId} id={entryId} newIds={newIds}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {event.type}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
            {event.payload !== undefined && (
              <pre className="mt-1 text-xs text-muted-foreground font-mono truncate max-w-full">
                {String(JSON.stringify(event.payload, null, 0) ?? "").slice(0, 120)}
              </pre>
            )}
          </HighlightableEntry>
        );
      })}
    </div>
  );
}

function PrescriptionsPanel({
  prescriptions,
  newIds,
}: {
  prescriptions: DevtoolsPrescription[];
  newIds: Set<string>;
}) {
  if (prescriptions.length === 0) {
    return <EmptyState message="No prescriptions received yet." />;
  }

  return (
    <div className="space-y-2">
      {prescriptions.map((p) => (
        <HighlightableEntry key={p.id} id={p.id} newIds={newIds}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-foreground truncate">
              {p.id}
            </span>
            <StatusBadge status={p.status} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Surface: {p.surfaceId}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Adaptations: {p.adaptations.length}
          </div>
          {p.contextLock && (
            <div className="mt-1 text-xs text-muted-foreground">
              Context Lock: {p.contextLock}
            </div>
          )}
        </HighlightableEntry>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: "accepted" | "rejected" | "pending" }) {
  const styles = {
    accepted: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    pending: "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}

function UserModelPanel({
  userModel,
  newIds,
}: {
  userModel: UserModelAttribute[];
  newIds: Set<string>;
}) {
  if (userModel.length === 0) {
    return <EmptyState message="No user model attributes." />;
  }

  return (
    <div className="space-y-2">
      {userModel.map((attr) => (
        <HighlightableEntry key={attr.key} id={`um-${attr.key}`} newIds={newIds}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">{attr.key}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(attr.confidence * 100)}% confidence
            </span>
          </div>
          <div className="mt-1 text-xs font-mono text-foreground">
            {JSON.stringify(attr.value)}
          </div>
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
            <span>Source: {attr.provenance}</span>
            {attr.expiresAt && <span>Expires: {formatTimestamp(attr.expiresAt)}</span>}
          </div>
        </HighlightableEntry>
      ))}
    </div>
  );
}

function ContextModelPanel({ contextModel }: { contextModel?: ContextModelData }) {
  if (!contextModel) {
    return <EmptyState message="No context model data available." />;
  }

  return (
    <div className="space-y-3">
      <InfoRow label="Device Type" value={contextModel.deviceType} />
      <InfoRow label="Viewport Width" value={`${contextModel.viewportWidth}px`} />
      <InfoRow label="Viewport Height" value={`${contextModel.viewportHeight}px`} />
      {Object.entries(contextModel)
        .filter(([k]) => !["deviceType", "viewportWidth", "viewportHeight"].includes(k))
        .map(([key, value]) => (
          <InfoRow key={key} label={key} value={String(value)} />
        ))}
    </div>
  );
}

function DecisionPipelinePanel({
  prescriptions,
}: {
  prescriptions: DevtoolsPrescription[];
}) {
  const withTier = prescriptions.filter((p) => p.decisionTier);

  if (withTier.length === 0) {
    return <EmptyState message="No pipeline decisions recorded." />;
  }

  return (
    <div className="space-y-2">
      {withTier.map((p) => (
        <div key={p.id} className="rounded border border-border p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-foreground truncate">
              {p.id}
            </span>
            <TierBadge tier={p.decisionTier!} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Surface: {p.surfaceId} · Adaptations: {p.adaptations.length}
          </div>
        </div>
      ))}
    </div>
  );
}

function TierBadge({ tier }: { tier: "rules" | "slm" | "llm" }) {
  const styles = {
    rules: "bg-blue-500/20 text-blue-400",
    slm: "bg-purple-500/20 text-purple-400",
    llm: "bg-orange-500/20 text-orange-400",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium uppercase", styles[tier])}>
      {tier}
    </span>
  );
}

function ExplanationsPanel({
  prescriptions,
}: {
  prescriptions: DevtoolsPrescription[];
}) {
  const withExplanation = prescriptions.filter((p) => p.explanation);

  if (withExplanation.length === 0) {
    return <EmptyState message="No explanations available." />;
  }

  return (
    <div className="space-y-2">
      {withExplanation.map((p) => (
        <div key={p.id} className="rounded border border-border p-2">
          <div className="text-xs font-mono text-muted-foreground truncate">
            {p.id}
          </div>
          <div className="mt-1 text-sm text-foreground">{p.explanation}</div>
        </div>
      ))}
    </div>
  );
}

function FeedbackHistoryPanel({
  feedbackHistory,
  newIds,
}: {
  feedbackHistory: FeedbackEntry[];
  newIds: Set<string>;
}) {
  if (feedbackHistory.length === 0) {
    return <EmptyState message="No feedback recorded yet." />;
  }

  return (
    <div className="space-y-2">
      {feedbackHistory.map((entry, idx) => {
        const entryId = `fb-${entry.prescriptionId}-${idx}`;
        return (
          <HighlightableEntry key={entryId} id={entryId} newIds={newIds}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-foreground truncate">
                {entry.prescriptionId}
              </span>
              <FeedbackActionBadge action={entry.action} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">
              {formatTimestamp(entry.timestamp)}
            </div>
          </HighlightableEntry>
        );
      })}
    </div>
  );
}

function FeedbackActionBadge({ action }: { action: "accept" | "dismiss" | "override" }) {
  const styles = {
    accept: "bg-green-500/20 text-green-400",
    dismiss: "bg-gray-500/20 text-gray-400",
    override: "bg-orange-500/20 text-orange-400",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[action])}>
      {action}
    </span>
  );
}

function ManifestViewerPanel({ manifest }: { manifest?: ManifestData }) {
  if (!manifest) {
    return <EmptyState message="No manifest data loaded." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Validation:</span>
        <StatusBadge
          status={
            manifest.validationStatus === "valid"
              ? "accepted"
              : manifest.validationStatus === "invalid"
                ? "rejected"
                : "pending"
          }
        />
      </div>
      {manifest.errors && manifest.errors.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-red-400">Errors:</span>
          {manifest.errors.map((err, idx) => (
            <div key={idx} className="text-xs text-red-300 font-mono">
              • {err}
            </div>
          ))}
        </div>
      )}
      <pre className="whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs font-mono text-foreground max-h-[300px] overflow-y-auto">
        {JSON.stringify(manifest.content, null, 2)}
      </pre>
    </div>
  );
}

function AIInteractionsSection({
  aiInteractions,
}: {
  aiInteractions: AIInteraction[];
}) {
  if (aiInteractions.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        AI Interactions
      </span>
      {aiInteractions.map((interaction, idx) => (
        <div key={idx} className="space-y-2 rounded border border-border p-2">
          <div className="flex items-center justify-between">
            <TierBadge tier={interaction.tier} />
            <span className="text-xs text-muted-foreground font-mono">
              {formatTimestamp(interaction.timestamp)}
            </span>
          </div>
          <ExpandableText text={interaction.prompt} label="Prompt" />
          <ExpandableText text={interaction.response} label="Response" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DevtoolsOverlay({
  isOpen,
  onToggle,
  sessionId,
  userId,
  consentState,
  manifestVersion,
  events = [],
  prescriptions = [],
  userModel = [],
  contextModel,
  feedbackHistory = [],
  aiInteractions = [],
  manifest,
  className,
}: DevtoolsOverlayProps) {
  const [activeTab, setActiveTab] = useState<TabId>("session");
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const prevEventsCountRef = useRef(events.length);
  const prevPrescriptionsRef = useRef<string[]>(prescriptions.map((p) => p.id));
  const prevFeedbackCountRef = useRef(feedbackHistory.length);

  // Track new entries and highlight them for 2 seconds (Req 8.12)
  useEffect(() => {
    const newIds = new Set<string>();

    // Check for new events
    if (events.length > prevEventsCountRef.current) {
      const newCount = events.length - prevEventsCountRef.current;
      for (let i = 0; i < newCount; i++) {
        newIds.add(`event-${events[i].timestamp}-${i}`);
      }
    }
    prevEventsCountRef.current = events.length;

    // Check for new prescriptions
    const prevPrescIds = new Set(prevPrescriptionsRef.current);
    for (const p of prescriptions) {
      if (!prevPrescIds.has(p.id)) {
        newIds.add(p.id);
      }
    }
    prevPrescriptionsRef.current = prescriptions.map((p) => p.id);

    // Check for new feedback
    if (feedbackHistory.length > prevFeedbackCountRef.current) {
      const newCount = feedbackHistory.length - prevFeedbackCountRef.current;
      for (let i = 0; i < newCount; i++) {
        newIds.add(`fb-${feedbackHistory[i].prescriptionId}-${i}`);
      }
    }
    prevFeedbackCountRef.current = feedbackHistory.length;

    if (newIds.size > 0) {
      setNewEntryIds((prev) => new Set([...prev, ...newIds]));
      // Clear highlights after 2 seconds
      const timer = setTimeout(() => {
        setNewEntryIds((prev) => {
          const next = new Set(prev);
          for (const id of newIds) {
            next.delete(id);
          }
          return next;
        });
      }, NEW_ENTRY_HIGHLIGHT_MS);
      return () => clearTimeout(timer);
    }
  }, [events, prescriptions, feedbackHistory]);

  // Persist panel state while hidden — component stays mounted but uses CSS to hide.
  // The parent controls isOpen; we just don't unmount.

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case "session":
        return (
          <SessionInfoPanel
            sessionId={sessionId}
            userId={userId}
            consentState={consentState}
            manifestVersion={manifestVersion}
          />
        );
      case "events":
        return <EventLogPanel events={events} newIds={newEntryIds} />;
      case "prescriptions":
        return <PrescriptionsPanel prescriptions={prescriptions} newIds={newEntryIds} />;
      case "user-model":
        return <UserModelPanel userModel={userModel} newIds={newEntryIds} />;
      case "context":
        return <ContextModelPanel contextModel={contextModel} />;
      case "pipeline":
        return (
          <>
            <DecisionPipelinePanel prescriptions={prescriptions} />
            <AIInteractionsSection aiInteractions={aiInteractions} />
          </>
        );
      case "explanations":
        return <ExplanationsPanel prescriptions={prescriptions} />;
      case "feedback":
        return <FeedbackHistoryPanel feedbackHistory={feedbackHistory} newIds={newEntryIds} />;
      case "manifest":
        return <ManifestViewerPanel manifest={manifest} />;
      default:
        return null;
    }
  }, [
    activeTab,
    sessionId,
    userId,
    consentState,
    manifestVersion,
    events,
    prescriptions,
    userModel,
    contextModel,
    feedbackHistory,
    aiInteractions,
    manifest,
    newEntryIds,
  ]);

  return (
    <aside
      className={cn(
        "fixed top-0 right-0 z-50 flex h-full w-[420px] max-w-[90vw] flex-col border-l border-border bg-background shadow-xl transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full",
        className
      )}
      aria-label="AURA Devtools Overlay"
      aria-hidden={!isOpen}
      role="complementary"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">AURA Devtools</h2>
        </div>
        <button
          onClick={onToggle}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close devtools"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            )}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4" role="tabpanel">
        {renderTabContent()}
      </div>
    </aside>
  );
}

// ─── Toggle Button (for use in Header) ──────────────────────────────────────

export interface DevtoolsToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Persistent toggle button for the Devtools Overlay, placed in the app header. (Req 8.11)
 */
export function DevtoolsToggleButton({
  isOpen,
  onToggle,
  className,
}: DevtoolsToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        isOpen
          ? "bg-blue-500/20 text-blue-400"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        className
      )}
      aria-label={isOpen ? "Close devtools" : "Open devtools"}
      aria-pressed={isOpen}
    >
      <Code className="h-3.5 w-3.5" />
      <span>Devtools</span>
      <ChevronRight
        className={cn(
          "h-3 w-3 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

export default DevtoolsOverlay;
