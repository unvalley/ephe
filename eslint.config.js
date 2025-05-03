import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";

// only for react-compiler lint
export default defineConfig([
  {
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parser: tsParser,
      globals: globals.browser,
    },
  },
  {
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/react-compiler": "error",
    },
  },
  {
    ignores: ["coverage/", "node_modules/", "dist/"],
  },
]);
