/**
 * ClockProvider interface and default implementation.
 *
 * The evaluator uses a ClockProvider to obtain timestamps, enabling
 * deterministic testing by injecting a fixed clock.
 */

import type { ClockProvider } from "../schema/types.js";

export type { ClockProvider };

/**
 * Default clock provider that returns the current wall-clock time
 * as an ISO 8601 string.
 */
export class DefaultClockProvider implements ClockProvider {
  now(): string {
    return new Date().toISOString();
  }
}
