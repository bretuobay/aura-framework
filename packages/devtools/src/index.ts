// --- Data Layer ---
export * from './schema';
export * from './client';
export * from './errors';

// --- Server Integration ---
export * from './route';

// --- Inspector Views ---
export { SessionSummaryView } from './components/SessionSummaryView';
export type { SessionSummaryViewProps } from './components/SessionSummaryView';
export { ManifestSummaryView } from './components/ManifestSummaryView';
export type { ManifestSummaryViewProps } from './components/ManifestSummaryView';
export { EventLogView } from './components/EventLogView';
export type { EventLogViewProps } from './components/EventLogView';
export { PrescriptionLogView } from './components/PrescriptionLogView';
export type { PrescriptionLogViewProps } from './components/PrescriptionLogView';
export { ProfileAttributesView } from './components/ProfileAttributesView';
export type { ProfileAttributesViewProps } from './components/ProfileAttributesView';

export { RuleMatchesView } from './components/RuleMatchesView';
export type { RuleMatchesViewProps } from './components/RuleMatchesView';

export { OperationalAuditView } from './components/OperationalAuditView';
export type { OperationalAuditViewProps } from './components/OperationalAuditView';

export { FeedbackHistoryView } from './components/FeedbackHistoryView';
export type { FeedbackHistoryViewProps } from './components/FeedbackHistoryView';

export { ConsentStateView } from './components/ConsentStateView';
export type { ConsentStateViewProps } from './components/ConsentStateView';

// --- Simulation Tools ---
export { ConsentEditor } from './components/ConsentEditor';
export type { ConsentEditorProps } from './components/ConsentEditor';

export { ProfileSimulator } from './components/ProfileSimulator';
export type { ProfileSimulatorProps } from './components/ProfileSimulator';

export { EventReplayer } from './components/EventReplayer';
export type { EventReplayerProps } from './components/EventReplayer';

export { PrescriptionInspector } from './components/PrescriptionInspector';
export type { PrescriptionInspectorProps } from './components/PrescriptionInspector';

// --- UI Container ---
export { DevtoolsPanel } from './components/DevtoolsPanel';
export type { DevtoolsPanelProps } from './components/DevtoolsPanel';
