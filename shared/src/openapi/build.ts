import { z } from "zod";
import { ErrorEnvelopeSchema } from "../schemas/error.js";
import { HealthResponseSchema, ReadyResponseSchema } from "../schemas/health.js";

/** Named schemas published under `components.schemas`. */
export const API_COMPONENTS = {
  ErrorEnvelope: ErrorEnvelopeSchema,
  HealthResponse: HealthResponseSchema,
  ReadyResponse: ReadyResponseSchema,
} as const;

type ComponentSchema = (typeof API_COMPONENTS)[keyof typeof API_COMPONENTS];

/** One documented endpoint: its method, path and response schema per HTTP status. */
export interface ApiRoute {
  readonly method: "get";
  readonly path: string;
  readonly operationId: string;
  readonly summary: string;
  readonly responses: Readonly<Record<string, ComponentSchema>>;
}

/** Every public endpoint (RQ-API-008). Add new endpoints here; never remove one. */
export const API_ROUTES: readonly ApiRoute[] = [
  {
    method: "get",
    path: "/api/v1/health",
    operationId: "getHealth",
    summary: "Liveness probe",
    responses: { "200": HealthResponseSchema },
  },
  {
    method: "get",
    path: "/api/v1/ready",
    operationId: "getReady",
    summary: "Readiness probe",
    responses: { "200": ReadyResponseSchema, "503": ErrorEnvelopeSchema },
  },
];

/** A minimal OpenAPI 3.1 document shape. */
export interface OpenApiDocument {
  openapi: "3.1.0";
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
}

/** Returns the `components.schemas` name of a registered schema; throws for an unregistered one. */
export function componentName(schema: ComponentSchema): string {
  const entry = Object.entries(API_COMPONENTS).find(([, candidate]) => candidate === schema);
  if (!entry) throw new Error("Response schema is not registered in API_COMPONENTS");
  return entry[0];
}

function toJsonSchema(schema: ComponentSchema): Record<string, unknown> {
  const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(schema) };
  delete jsonSchema["$schema"];
  return jsonSchema;
}

function describeOperation(route: ApiRoute): Record<string, unknown> {
  const responses = Object.fromEntries(
    Object.entries(route.responses).map(([status, schema]) => [
      status,
      {
        description: componentName(schema),
        content: {
          "application/json": { schema: { $ref: `#/components/schemas/${componentName(schema)}` } },
        },
      },
    ]),
  );
  return { operationId: route.operationId, summary: route.summary, responses };
}

/**
 * Builds the OpenAPI document from the shared Zod schemas (RQ-API-008).
 * The output is deterministic so it can be compared with the committed baseline.
 */
export function buildOpenApiDocument(): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {};
  for (const route of API_ROUTES) {
    paths[route.path] = { ...paths[route.path], [route.method]: describeOperation(route) };
  }
  const schemas = Object.fromEntries(
    Object.entries(API_COMPONENTS).map(([name, schema]) => [name, toJsonSchema(schema)]),
  );
  return { openapi: "3.1.0", info: { title: "Application API", version: "1" }, paths, components: { schemas } };
}
