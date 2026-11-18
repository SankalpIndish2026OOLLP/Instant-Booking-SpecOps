/**
 * Headers on every API response, including errors (RQ-API-006). Same set the API sent before the move to Bun.
 */
export const API_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": "default-src 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Origin-Agent-Cluster": "?1",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "X-Download-Options": "noopen",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Permitted-Cross-Domain-Policies": "none",
  "X-XSS-Protection": "0",
};

/** Headers on client page and asset responses in prod (RQ-WEB-005). */
export const PAGE_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const PREFLIGHT_MAX_AGE_SECONDS = "600";

/** CORS headers for `origin` when it is in the allowlist, otherwise none (RQ-API-005). */
export function corsHeaders(origin: string | null, allowedOrigins: readonly string[]): Record<string, string> {
  if (origin === null || !allowedOrigins.includes(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

/** Extra headers answering a CORS preflight from an allowed origin. */
export function preflightHeaders(request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") ?? "",
    "Access-Control-Max-Age": PREFLIGHT_MAX_AGE_SECONDS,
  };
}

/** Copies `headers` onto `response`. */
export function setHeaders(response: Response, headers: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
}
