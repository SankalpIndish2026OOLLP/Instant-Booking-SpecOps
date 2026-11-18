import type { ErrorCode } from "@app/shared";

/**
 * Base class for every error that maps to an API error response (RQ-API-002).
 * Subclasses fix the code and HTTP status; the error handler turns them into the envelope.
 */
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;
}

/** 404: no endpoint or resource matches the request (RQ-API-001). */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly httpStatus = 404;

  /** Creates the error with a client-safe message. */
  constructor(message = "The requested resource does not exist.") {
    super(message);
  }
}

/** 400: the request body is not valid JSON (RQ-API-002). */
export class BadRequestError extends AppError {
  readonly code = "INVALID_JSON";
  readonly httpStatus = 400;

  /** Creates the error with a client-safe message. */
  constructor(message = "The request body is not valid JSON.") {
    super(message);
  }
}

/** 413: the request body exceeds the configured limit (RQ-API-004). */
export class PayloadTooLargeError extends AppError {
  readonly code = "PAYLOAD_TOO_LARGE";
  readonly httpStatus = 413;

  /** Creates the error with a client-safe message. */
  constructor(message = "The request body is too large.") {
    super(message);
  }
}

/** Codes a 503 response can carry. */
export type UnavailableCode = Extract<ErrorCode, "DATABASE_UNAVAILABLE" | "SHUTTING_DOWN">;

const UNAVAILABLE_MESSAGES: Record<UnavailableCode, string> = {
  DATABASE_UNAVAILABLE: "The database is not reachable.",
  SHUTTING_DOWN: "The server is shutting down.",
};

/** 503: the server cannot serve traffic right now (RQ-OPS-002). */
export class ServiceUnavailableError extends AppError {
  readonly httpStatus = 503;

  /** Creates the error for one of the unavailable codes. */
  constructor(readonly code: UnavailableCode) {
    super(UNAVAILABLE_MESSAGES[code]);
  }
}
