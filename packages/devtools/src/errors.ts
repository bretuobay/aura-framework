/**
 * Error thrown when DevtoolsClient receives a 404 for the requested session.
 */
export class DevtoolsSessionNotFoundError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "DevtoolsSessionNotFoundError";
  }
}

/**
 * Error thrown when the server returns an HTTP error (4xx/5xx) other than 404.
 */
export class DevtoolsRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DevtoolsRequestError";
  }
}

/**
 * Error thrown when a network-level failure occurs (timeout, DNS, connection refused, etc.).
 */
export class DevtoolsNetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DevtoolsNetworkError";
  }
}

/**
 * Error thrown when a server response fails Zod schema validation.
 */
export class DevtoolsValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Array<{
      path: (string | number)[];
      message: string;
    }>,
  ) {
    super(message);
    this.name = "DevtoolsValidationError";
  }
}
