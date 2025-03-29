import { createFromBuffer, type GlobalConfiguration } from "@dprint/formatter";
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

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Upgrade if needed
      const pluginUrl = "https://plugins.dprint.dev/markdown-0.18.0.wasm";
      const response = await fetch(pluginUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dprint markdown plugin: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      this.formatter = await createFromBuffer(buffer);
      
      this.setConfig({
        indentWidth: this.config.indentWidth ?? 2,
        lineWidth: this.config.lineWidth ?? 80,
        useTabs: this.config.useTabs ?? false,
        newLineKind: this.config.newLineKind ?? "auto"
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize dprint markdown service:", error);
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