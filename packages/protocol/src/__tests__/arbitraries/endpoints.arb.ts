import * as fc from "fast-check";
import type {
  SessionRequest,
  EventsRequest,
  ContextRequest,
  PrescriptionsStreamRequest,
  FeedbackRequest,
  ExplainRequest,
  ConsentRequest,
  ProfileRequest,
  ProfileCorrectionRequest,
} from "../../endpoints.js";
import { arbNonEmptyString, arbContextSequenceId } from "./primitives.arb.js";
import { arbCapabilityManifest } from "./manifest.arb.js";
import { arbAuraEvent } from "./event.arb.js";
import { arbContextModel } from "./context.arb.js";
import { arbConsentProfile } from "./consent.arb.js";
import { arbFeedbackEvent } from "./feedback.arb.js";
import { arbProfileCorrection } from "./correction.arb.js";

type EndpointName =
  | "session"
  | "events"
  | "context"
  | "prescriptionsStream"
  | "feedback"
  | "explain"
  | "consent"
  | "profile"
  | "profileCorrection";

function arbSessionRequest(): fc.Arbitrary<SessionRequest> {
  return fc
    .record({
      sessionId: arbNonEmptyString(),
      userId: arbNonEmptyString(),
      manifest: arbCapabilityManifest(),
      consentProfile: arbConsentProfile(),
      context: arbContextModel(),
      contextSequenceId: fc.option(arbContextSequenceId(), { nil: undefined }),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        sessionId: obj.sessionId,
        userId: obj.userId,
        manifest: obj.manifest,
        consentProfile: obj.consentProfile,
        context: obj.context,
      };
      if (obj.contextSequenceId !== undefined)
        result.contextSequenceId = obj.contextSequenceId;
      return result as SessionRequest;
    });
}

function arbEventsRequest(): fc.Arbitrary<EventsRequest> {
  return fc
    .record({
      sessionId: arbNonEmptyString(),
      events: fc
        .array(arbAuraEvent(), { minLength: 1, maxLength: 3 })
        .map((arr) => arr as [any, ...any[]]),
      contextSequenceId: fc.option(arbContextSequenceId(), { nil: undefined }),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        sessionId: obj.sessionId,
        events: obj.events,
      };
      if (obj.contextSequenceId !== undefined)
        result.contextSequenceId = obj.contextSequenceId;
      return result as EventsRequest;
    });
}

function arbContextRequest(): fc.Arbitrary<ContextRequest> {
  return fc.record({
    sessionId: arbNonEmptyString(),
    contextPatch: arbContextModel().map((ctx) => {
      // contextPatch is partial ContextModel — remove required fields randomly
      const partial: Record<string, unknown> = { ...ctx };
      return partial;
    }),
    contextSequenceId: arbContextSequenceId(),
  }) as fc.Arbitrary<ContextRequest>;
}

function arbPrescriptionsStreamRequest(): fc.Arbitrary<PrescriptionsStreamRequest> {
  return fc.record({
    sessionId: arbNonEmptyString(),
    surfaceId: arbNonEmptyString(),
  });
}

function arbFeedbackRequest(): fc.Arbitrary<FeedbackRequest> {
  return fc.record({
    sessionId: arbNonEmptyString(),
    feedback: arbFeedbackEvent(),
  });
}

function arbExplainRequest(): fc.Arbitrary<ExplainRequest> {
  return fc.record({
    sessionId: arbNonEmptyString(),
    prescriptionId: arbNonEmptyString(),
  });
}

function arbConsentRequest(): fc.Arbitrary<ConsentRequest> {
  return fc.record({
    sessionId: arbNonEmptyString(),
    consentPatch: arbConsentProfile(),
  });
}

function arbProfileRequest(): fc.Arbitrary<ProfileRequest> {
  return fc
    .record({
      sessionId: arbNonEmptyString(),
      userId: fc.option(arbNonEmptyString(), { nil: undefined }),
    })
    .map((obj) => {
      const result: Record<string, unknown> = {
        sessionId: obj.sessionId,
      };
      if (obj.userId !== undefined) result.userId = obj.userId;
      return result as ProfileRequest;
    });
}

function arbProfileCorrectionRequest(): fc.Arbitrary<ProfileCorrectionRequest> {
  return fc.record({
    sessionId: arbNonEmptyString(),
    correction: arbProfileCorrection(),
  });
}

/**
 * Generates a valid endpoint request based on the endpoint name.
 * Supports all 9 AUIP v0 endpoints.
 */
export function arbEndpointRequest(
  endpoint: EndpointName
): fc.Arbitrary<unknown> {
  switch (endpoint) {
    case "session":
      return arbSessionRequest();
    case "events":
      return arbEventsRequest();
    case "context":
      return arbContextRequest();
    case "prescriptionsStream":
      return arbPrescriptionsStreamRequest();
    case "feedback":
      return arbFeedbackRequest();
    case "explain":
      return arbExplainRequest();
    case "consent":
      return arbConsentRequest();
    case "profile":
      return arbProfileRequest();
    case "profileCorrection":
      return arbProfileCorrectionRequest();
  }
}
