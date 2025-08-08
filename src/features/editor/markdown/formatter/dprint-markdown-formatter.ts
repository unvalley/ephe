import { createChannel } from "bidc";
import type { MarkdownFormatter, FormatterConfig } from "./markdown-formatter";
import FormatterWorker from "./formatter.worker?worker";

type FormatterMessage = {
  type: "format";
  text: string;
  config?: {
    global?: {
      indentWidth?: number;
      lineWidth?: number;
      newLineKind?: "auto" | "lf" | "crlf";
    };
    markdown?: any;
  };
};

type FormatterResponse = {
  type: "formatted";
  text: string;
} | {
  type: "error";
  message: string;
};

/**
 * Markdown formatter implementation using dprint's WASM in a web worker
 */
export class DprintMarkdownFormatter implements MarkdownFormatter {
  private static instance: DprintMarkdownFormatter | null = null;
  private worker: Worker | null = null;
  private channel: ReturnType<typeof createChannel> | null = null;
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

  /**
   * Check if running in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Only initialize worker in browser environment
      if (!this.isBrowser()) {
        throw new Error("Worker-based formatter only works in browser environment");
      }

      // Create worker and establish bidc connection
      this.worker = new FormatterWorker();
      this.channel = createChannel(this.worker as Worker);

      this.isInitialized = true;
      console.log("Formatter worker connection established");
    } catch (error) {
      console.error("Failed to initialize formatter worker:", error);
      throw error;
    }
  }

  /**
   * Clean up worker resources
   */
  public dispose(): void {
    if (this.channel) {
      this.channel.cleanup();
      this.channel = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Format markdown text
   */
  public async formatMarkdown(text: string): Promise<string> {
    if (!this.isInitialized || !this.channel) {
      throw new Error("Formatter not initialized properly");
    }

    const response = await this.channel.send({
      type: "format",
      text,
      config: {
        global: {
          indentWidth: this.config.indentWidth ?? 2,
          lineWidth: this.config.lineWidth ?? 100,
          newLineKind: this.config.newLineKind ?? "lf",
        },
      },
    } as FormatterMessage) as FormatterResponse;

    if (response.type === "error") {
      throw new Error(`Formatting failed: ${response.message}`);
    }

    return response.text;
  }
}
