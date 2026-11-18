import type { Config } from "../config/env.js";
import { NotFoundError } from "../errors/app-error.js";
import type { LifecycleState } from "../lifecycle/state.js";
import type { Logger } from "../logging/logger.js";
import { readJsonBody } from "./body.js";
import { toErrorResponse } from "./errors.js";
import { REQUEST_ID_HEADER, resolveRequestId } from "./request-id.js";
import { API_SECURITY_HEADERS, corsHeaders, preflightHeaders, setHeaders } from "./security.js";
import type { HttpMethod, RequestContext, RouteHandler, RouteTable } from "./types.js";

const HTTP_NO_CONTENT = 204;

/** Dependencies of {@link createApiHandler}. */
export interface ApiHandlerOptions {
  config: Pick<Config, "corsOrigins" | "bodyLimitBytes">;
  logger: Logger;
  lifecycle: LifecycleState;
  routes: RouteTable;
}

function findRoute(routes: RouteTable, method: string, pathname: string): RouteHandler {
  const handler = routes[pathname]?.[method as HttpMethod];
  if (!handler) throw new NotFoundError();
  return handler;
}

async function dispatch(options: ApiHandlerOptions, context: Omit<RequestContext, "body">): Promise<Response> {
  try {
    const body = await readJsonBody(context.request, options.config.bodyLimitBytes);
    const handler = findRoute(options.routes, context.request.method, context.url.pathname);
    return await handler({ ...context, body });
  } catch (error) {
    return toErrorResponse(error, context.requestId, context.logger);
  }
}

/**
 * The `/api/v1` pipeline: request ID, preflight, body limit, routing, error envelope, then API security headers,
 * CORS, draining and one request log line (RQ-API-001 to RQ-API-007, RQ-OPS-008).
 */
export function createApiHandler(options: ApiHandlerOptions): (request: Request) => Promise<Response> {
  return async (request) => {
    const started = performance.now();
    const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
    const logger = options.logger.child({ requestId });
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get("Origin"), options.config.corsOrigins);
    const isPreflight = request.method === "OPTIONS" && Object.keys(cors).length > 0;
    const response = isPreflight
      ? new Response(null, { status: HTTP_NO_CONTENT, headers: preflightHeaders(request) })
      : await dispatch(options, { request, url, requestId, logger });
    setHeaders(response, { ...API_SECURITY_HEADERS, ...cors, [REQUEST_ID_HEADER]: requestId });
    if (options.lifecycle.shuttingDown) response.headers.set("Connection", "close");
    logger.info("request", {
      method: request.method,
      path: url.pathname,
      status: response.status,
      durationMs: Math.round(performance.now() - started),
    });
    return response;
  };
}
