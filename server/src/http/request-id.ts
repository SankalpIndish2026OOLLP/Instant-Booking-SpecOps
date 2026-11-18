/** Header carrying the request ID in both directions (RQ-API-003). */
export const REQUEST_ID_HEADER = "X-Request-Id";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/** Returns `incoming` when it is a safe request ID, otherwise a new random UUID. */
export function resolveRequestId(incoming: string | null | undefined): string {
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
}
