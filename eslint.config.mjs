import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "storage/**",
      "prisma/migrations/**",
      "storybook-static/**",
      ".storybook/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Pragmatic relaxations for a scaffold codebase (keep CI green without churn).
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Node scripts / config can use console and require-style freely.
    files: ["prisma/**", "worker.ts", "*.config.*", "lib/jobs/**", "lib/email/**"],
    rules: { "no-console": "off" },
  },
  {
    // Plain Node ESM config + scripts (.mjs): define Node globals so `no-undef`
    // doesn't fire on process/console etc. (these files aren't covered by the
    // TS/Next configs that otherwise provide the environment).
    files: ["**/*.mjs", "scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: { "no-console": "off" },
  },
);
