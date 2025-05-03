import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

const ReactCompilerConfig = {};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
    wasm(),
    topLevelAwait(),
    tailwindcss(),
    visualizer({
      filename: "bundle-size.html",
      open: true,
      template: "treemap",
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
