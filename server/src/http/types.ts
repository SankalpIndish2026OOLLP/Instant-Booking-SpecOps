import type { Logger } from "../logging/logger.js";

/** What a route handler receives besides the request. */
export interface RequestContext {
  request: Request;
  url: URL;
  requestId: string;
  /** Logger that adds `requestId` to every line. */
  logger: Logger;
  /** Parsed JSON body, or `undefined` when there is none. */
  body: unknown;
}

/** An API route handler. */
export type RouteHandler = (context: RequestContext) => Response | Promise<Response>;

/** HTTP methods the route table supports. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Exact path -> method -> handler. */
export type RouteTable = Readonly<Record<string, Partial<Record<HttpMethod, RouteHandler>>>>;
