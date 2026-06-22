import type {
  ContextModel,
  ProfileAttribute,
  FeedbackEvent,
  ExplanationRecord,
  UIPrescription,
} from "@aura/protocol";

import type { SessionRecord } from "../types/internal.types.js";

/**
 * Typed storage interface for AUIP session records.
 * Supports create, read, update, and delete operations on SessionRecord instances.
 */
export interface ISessionStore {
  create(record: SessionRecord): Promise<void>;
  get(sessionId: string): Promise<SessionRecord | null>;
  update(sessionId: string, patch: Partial<SessionRecord>): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

/**
 * Typed storage interface for per-session ContextModel snapshots.
 * Supports set (overwrite) and get operations keyed by session ID.
 */
export interface IContextStore {
  set(sessionId: string, context: ContextModel): Promise<void>;
  get(sessionId: string): Promise<ContextModel | null>;
}

/**
 * Typed storage interface for per-user ProfileAttribute collections.
 * Supports upsert, list, delete, and single-attribute retrieval.
 */
export interface IUserModelStore {
  upsertAttribute(userId: string, attribute: ProfileAttribute): Promise<void>;
  getAttributes(userId: string): Promise<ProfileAttribute[]>;
  deleteAttribute(userId: string, attributeId: string): Promise<void>;
  getAttribute(userId: string, attributeId: string): Promise<ProfileAttribute | null>;
}

/**
 * Typed storage interface for persisted FeedbackEvent records.
 * Supports append-only recording and retrieval by prescription ID.
 */
export interface IFeedbackStore {
  record(sessionId: string, event: FeedbackEvent): Promise<void>;
  getByPrescriptionId(sessionId: string, prescriptionId: string): Promise<FeedbackEvent[]>;
}

/**
 * Typed storage interface for ExplanationRecord objects keyed by prescription ID.
 * Supports store and retrieval operations.
 */
export interface IExplanationStore {
  store(prescriptionId: string, explanation: ExplanationRecord): Promise<void>;
  get(prescriptionId: string): Promise<ExplanationRecord | null>;
}

/**
 * Typed storage interface for emitted UIPrescription records.
 * Supports store, single retrieval, and active-prescription listing filtered by expiry.
 */
export interface IPrescriptionStore {
  store(sessionId: string, prescription: UIPrescription): Promise<void>;
  get(sessionId: string, prescriptionId: string): Promise<UIPrescription | null>;
  listActive(sessionId: string, asOf: string): Promise<UIPrescription[]>;
}
