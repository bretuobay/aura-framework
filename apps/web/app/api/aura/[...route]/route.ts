/**
 * AURA API catch-all route handler.
 *
 * Delegates all /api/aura/* requests to the @aura/server Hono middleware
 * via `registerAuipRoutes`. Uses in-memory stores for session and event data
 * since this is a demo application.
 *
 * Mounted routes:
 *   - POST /api/aura/session     — Create session
 *   - POST /api/aura/events      — Ingest events
 *   - POST /api/aura/context     — Update context
 *   - GET  /api/aura/prescriptions/stream — SSE prescription delivery
 *   - POST /api/aura/feedback    — Collect feedback
 *   - GET  /api/aura/explain/:id — Retrieve explanation
 *   - POST /api/aura/consent     — Manage consent
 *   - GET  /api/aura/profile     — View user model
 *   - POST /api/aura/profile/correction — Correct user model
 *
 * @see Requirements 16.4
 */

import { Hono } from "hono";
import {
  registerAuipRoutes,
  createInMemorySessionStore,
  createInMemoryContextStore,
  createInMemoryUserModelStore,
  createInMemoryFeedbackStore,
  createInMemoryExplanationStore,
  createInMemoryPrescriptionStore,
} from "@aura/server";
import type { IRulesPipeline } from "@aura/server";
import type { UIPrescription } from "@aura/protocol";

// ---------------------------------------------------------------------------
// In-memory stores (singleton instances for the lifetime of the server process)
// ---------------------------------------------------------------------------

const sessionStore = createInMemorySessionStore();
const contextStore = createInMemoryContextStore();
const userModelStore = createInMemoryUserModelStore();
const feedbackStore = createInMemoryFeedbackStore();
const explanationStore = createInMemoryExplanationStore();
const prescriptionStore = createInMemoryPrescriptionStore();

// ---------------------------------------------------------------------------
// Demo rules pipeline — returns empty prescriptions by default.
// The actual adaptation logic is driven by simulation scenarios and the
// @aura/rules engine when configured via demo modes.
// ---------------------------------------------------------------------------

const demoPipeline: IRulesPipeline = {
  async evaluate(): Promise<UIPrescription[]> {
    // In demo mode, prescriptions are driven by simulation scenarios
    // or the rules engine. This no-op pipeline satisfies the required
    // interface for @aura/server initialization.
    return [];
  },
};

// ---------------------------------------------------------------------------
// Hono application with AURA routes registered
// ---------------------------------------------------------------------------

const app = new Hono().basePath("/api");

registerAuipRoutes(app, {
  pipeline: demoPipeline,
  sessionStore,
  contextStore,
  userModelStore,
  feedbackStore,
  explanationStore,
  prescriptionStore,
});

// ---------------------------------------------------------------------------
// Next.js App Router handlers
//
// Hono's `app.fetch()` accepts a standard Request and returns a standard
// Response, which is exactly what Next.js App Router route handlers expect.
// ---------------------------------------------------------------------------

async function handler(request: Request): Promise<Response> {
  return app.fetch(request);
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
