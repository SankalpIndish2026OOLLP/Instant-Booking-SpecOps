// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const MAX_FUNCTION_LINES = 40;

/**
 * Builds a layering rule: files matched by `files` may not import from the listed folders.
 * @param {string[]} files
 * @param {string[]} forbidden folder names
 * @param {string} reason
 */
function layer(files, forbidden, reason) {
  return {
    files,
    // Tests wire several layers together on purpose.
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: forbidden.map((folder) => ({
            group: [`**/${folder}/**`, `**/${folder}`],
            message: reason,
          })),
        },
      ],
    },
  };
}

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "playwright-report/**",
      "test-results/**",
      "openspec/**",
      ".claude/**",
      ".agents/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Module augmentation (e.g. adding jest-dom matchers to bun:test) needs `interface X extends Y {}`.
      "@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
      "max-lines-per-function": [
        "error",
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true },
      ],
      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          enforceConst: true,
        },
      ],
    },
  },
  {
    // Tests, test helpers and tooling scripts describe concrete scenarios with literal values.
    files: ["**/*.test.{ts,tsx}", "**/test/**", "e2e/**", "scripts/**", "**/scripts/**", "*.config.{js,ts}"],
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
      "max-lines-per-function": "off",
    },
  },
  layer(
    ["server/src/routes/**"],
    ["services", "repositories", "providers"],
    "Routes call controllers only (routes -> controllers -> services -> repositories/providers).",
  ),
  layer(
    ["server/src/controllers/**"],
    ["routes", "repositories", "providers"],
    "Controllers call services only.",
  ),
  layer(
    ["server/src/services/**"],
    ["routes", "controllers", "http"],
    "Services never call upward.",
  ),
  layer(
    ["server/src/repositories/**", "server/src/providers/**"],
    ["routes", "controllers", "services", "http"],
    "Repositories and providers are the bottom layer.",
  ),
  layer(["shared/**"], ["server", "client"], "/shared imports from neither side."),
  layer(["client/src/components/**"], ["api"], "Components reach the API through hooks."),
  layer(["client/src/hooks/**"], ["components"], "Hooks never import components."),
);
