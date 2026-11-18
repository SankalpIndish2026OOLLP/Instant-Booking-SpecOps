import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { API_COMPONENTS, API_ROUTES, buildOpenApiDocument, componentName } from "./build.js";

describe("buildOpenApiDocument", () => {
  it("RQ-API-008 documents every route with resolvable schema references", () => {
    // Given the route table / When the document is built
    const document = buildOpenApiDocument();
    // Then every route appears and each $ref points at a published component
    for (const route of API_ROUTES) {
      const operation = document.paths[route.path]?.[route.method] as {
        responses: Record<string, { content: { "application/json": { schema: { $ref: string } } } }>;
      };
      for (const status of Object.keys(route.responses)) {
        const ref = operation.responses[status]?.content["application/json"].schema.$ref ?? "";
        const name = ref.replace("#/components/schemas/", "");
        expect(document.components.schemas[name]).toBeDefined();
      }
    }
  });

  it("RQ-API-008 refuses a response schema that is not a published component", () => {
    // Given a schema missing from API_COMPONENTS / When named / Then it throws
    const unregistered = z.object({ status: z.literal("ok") });
    expect(() => componentName(unregistered as never)).toThrow(/not registered/);
    expect(componentName(API_COMPONENTS.HealthResponse)).toBe("HealthResponse");
  });

  it("RQ-API-008 is deterministic", () => {
    // Given two builds / When compared / Then they are identical
    expect(JSON.stringify(buildOpenApiDocument())).toBe(JSON.stringify(buildOpenApiDocument()));
  });

  it("RQ-API-008 publishes component schemas without a $schema key", () => {
    // Given the built document / When its components are inspected / Then none declares $schema
    for (const schema of Object.values(buildOpenApiDocument().components.schemas)) {
      expect(schema).not.toHaveProperty("$schema");
    }
  });
});
