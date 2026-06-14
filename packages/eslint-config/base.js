import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,

  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },

  {
    plugins: { onlyWarn },
  },

  {
    rules: {
      // catch unhandled promises (critical in async Node.js)
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // no any
      "@typescript-eslint/no-explicit-any": "warn",

      // no unused vars
      "@typescript-eslint/no-unused-vars": "error",

      // no console.log in production code
      "no-console": "warn",

      // no duplicate imports
      "no-duplicate-imports": "error",
    },
  },

  // relaxed for test files
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "no-console": "off",
    },
  },

  {
    ignores: ["dist/**", "node_modules/**", ".turbo/**"],
  },
];