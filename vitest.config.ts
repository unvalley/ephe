import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    includeSource: ["src/**/*.{js,ts}"],
    coverage: {
      provider: "v8",
    },
  },
});
