// @ts-check
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "eslint.config.js",
      "**/tsup.config.*",
      "**/vite.config.*",
      "**/vitest.config.*",
    ],
  },

  // TypeScript rules — all packages
  {
    files: [
      "packages/*/src/**/*.{ts,tsx}",
      "packages/*/__tests__/**/*.{ts,tsx}",
      "packages/*/tests/**/*.{ts,tsx}",
    ],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },

  // React rules — react + devtools packages only
  {
    files: ["packages/react/**/*.{ts,tsx}", "packages/devtools/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      // Resetting state at the start of an effect before an async fetch is a
      // common intentional pattern; downgrade to warn rather than block CI.
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  // Test file overrides — relax rules that are legitimately needed in tests
  {
    files: [
      "packages/*/__tests__/**/*.{ts,tsx}",
      "packages/*/tests/**/*.{ts,tsx}",
      "packages/*/src/__tests__/**/*.{ts,tsx}",
    ],
    rules: {
      // Test arbitraries and mocks often need `any` for flexibility
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused setup vars in test helpers are common
      "@typescript-eslint/no-unused-vars": "warn",
      // Render-counting via useRef.current++ during render is a valid test pattern
      "react-hooks/refs": "off",
    },
  },

  // Prettier — must be last to disable conflicting formatting rules
  prettierConfig,
);
