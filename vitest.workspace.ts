import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "node",
      include: ["src/**/*.test.ts"],
      exclude: ["src/**/*.browser.test.ts"],
      environment: "node",
    },
  },
  {
    test: {
      name: "browser",
      include: ["src/**/*.browser.test.ts"],
      browser: {
        enabled: true,
        instances: [{ browser: "chromium" }],
      },
    },
  },
]);
