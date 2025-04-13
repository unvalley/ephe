import { createFromBuffer, type GlobalConfiguration } from "@dprint/formatter";
import { getPath } from "@dprint/markdown";
import type { MarkdownFormatter, FormatterConfig } from "./markdown-formatter";

/**
 * Markdown formatter implementation using dprint's high-performance WASM
 */
export class DprintMarkdownFormatter implements MarkdownFormatter {
  private static instance: DprintMarkdownFormatter | null = null;
  private formatter: {
    formatText(params: { filePath: string; fileText: string }): string;
    setConfig(globalConfig: GlobalConfiguration, specificConfig?: Record<string, unknown>): void;
  } | null = null;
  private isInitialized = false;
  private config: FormatterConfig;
  private static readonly WASM_URL = "/wasm/dprint-markdown.wasm";

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: FormatterConfig = {}) {
    this.config = config;
  }

  /**
   * Get or create the singleton instance with provided config
   */
  public static async getInstance(config: FormatterConfig = {}): Promise<DprintMarkdownFormatter> {
    if (!DprintMarkdownFormatter.instance) {
      DprintMarkdownFormatter.instance = new DprintMarkdownFormatter(config);
      await DprintMarkdownFormatter.instance.initialize();
    }
    return DprintMarkdownFormatter.instance;
  }

  /**
   * Check if running in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }

  /**
   * Load WASM buffer based on environment
   */
  private async loadWasmBuffer(): Promise<Uint8Array> {
    if (this.isBrowser()) {
      // In browser environment, fetch WASM from static assets
      const response = await fetch(DprintMarkdownFormatter.WASM_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }

    // In Node.js environment, load WASM directly from file
    // Note: This code won't be executed when bundled with Vite
    const fs = await import("node:fs");
    const wasmPath = getPath();
    const buffer = fs.readFileSync(wasmPath);
    return new Uint8Array(buffer);
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load WASM buffer based on current environment
      const wasmBuffer = await this.loadWasmBuffer();

      this.formatter = await createFromBuffer(wasmBuffer);

      this.setConfig({
        indentWidth: this.config.indentWidth ?? 2,
        lineWidth: this.config.lineWidth ?? 80,
        useTabs: this.config.useTabs ?? false,
        newLineKind: this.config.newLineKind ?? "auto",
      });

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize dprint markdown formatter:", error);
      throw error;
    }
  }

  // should check dprint markdown config if you want to add more options
  private setConfig(globalConfig: GlobalConfiguration, dprintMarkdownConfig: Record<string, unknown> = {}): void {
    if (!this.formatter) {
      throw new Error("Formatter not initialized. Call initialize() first.");
    }
    this.formatter.setConfig(globalConfig, dprintMarkdownConfig);
  }

  /**
   * Format markdown text
   */
  public async formatMarkdown(text: string): Promise<string> {
    if (!this.isInitialized || !this.formatter) {
      throw new Error("Formatter not initialized properly");
    }

    return this.formatter.formatText({
      filePath: "ephe.md",
      fileText: text,
    });
  }
}
