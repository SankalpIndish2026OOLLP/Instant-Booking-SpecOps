import type { ErrorEnvelope } from "@app/shared";
import { AppError } from "../errors/app-error.js";
import { errorFields, type Logger } from "../logging/logger.js";

const HTTP_INTERNAL_ERROR = 500;
const INTERNAL_MESSAGE = "An unexpected error occurred.";

/**
 * Turns any thrown value into the standard envelope (RQ-API-002). Unknown errors become 500 `INTERNAL_ERROR`
 * with a generic message; their details go to the log only.
 */
export function toErrorResponse(error: unknown, requestId: string, logger: Logger): Response {
  const appError = error instanceof AppError ? error : undefined;
  if (!appError) logger.error("unhandled error", errorFields(error));
  const body: ErrorEnvelope = {
    error: {
      code: appError?.code ?? "INTERNAL_ERROR",
      message: appError?.message ?? INTERNAL_MESSAGE,
      requestId,
    },
  };
  return Response.json(body, { status: appError?.httpStatus ?? HTTP_INTERNAL_ERROR });
}
