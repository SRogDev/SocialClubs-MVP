// Next 16: eslint-config-next ships a flat config array (no FlatCompat needed).
import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // ========================================
      // BEST PRACTICES - Buenas prácticas generales
      // ========================================
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "no-alert": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": ["error", "always"],
      "prefer-template": "error",
      "prefer-arrow-callback": "error",

      // ========================================
      // REACT & HOOKS
      // ========================================
      "react/prop-types": "off", // Usamos TypeScript
      "react/react-in-jsx-scope": "off", // No necesario en Next.js
      "react/jsx-no-target-blank": "error",
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // ========================================
      // NEXT.JS SPECIFIC
      // ========================================
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn", // Preferir next/image

      // ========================================
      // CODE QUALITY - Mantenibilidad
      // ========================================
      "complexity": ["warn", 15], // Máxima complejidad ciclomática
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      "max-depth": ["warn", 4],
      "max-nested-callbacks": ["warn", 3],

      // ========================================
      // IMPORTS - Organización
      // ========================================
      "import/order": [
        "error",
        {
          groups: [
            "builtin",   // Node.js modules
            "external",  // npm packages
            "internal",  // Alias paths
            ["parent", "sibling", "index"],
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",

      // ========================================
      // PERMISIVIDAD BALANCEADA
      // ========================================
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
    },
  },
  {
    // TypeScript-specific rules: scoped to TS files so the plugin resolves.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      // Tests pueden ser más permisivos
      "@typescript-eslint/no-explicit-any": "off",
      "max-lines-per-function": "off",
      "no-console": "off",
    },
  },
];

export default eslintConfig;
