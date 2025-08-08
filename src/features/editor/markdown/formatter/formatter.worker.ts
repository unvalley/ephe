import { createFromBuffer } from "@dprint/formatter";
import { createChannel } from "bidc";

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

let formatter: ReturnType<typeof createFromBuffer> | null = null;
let isInitialized = false;

async function loadWasmBuffer(): Promise<Uint8Array> {
  // In worker environment, fetch WASM from static assets
  const response = await fetch("/wasm/dprint-markdown.wasm");
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function initialize() {
  if (isInitialized) return;

  try {
    const wasmBuffer = await loadWasmBuffer();
    formatter = await createFromBuffer(wasmBuffer.slice());

    // Set default config
    formatter.setConfig(
      {
        indentWidth: 2,
        lineWidth: 100,
        newLineKind: "lf",
      },
      {},
    );

    isInitialized = true;
    console.log("Formatter worker initialized");
  } catch (error) {
    console.error("Failed to initialize formatter in worker:", error);
    throw error;
  }
}

// Initialize on worker startup
initialize().catch(console.error);

// Set up bidc channel
const channel = createChannel();

channel.receive(async (message: FormatterMessage): Promise<FormatterResponse> => {
  try {
    if (message.type === "format") {
      if (!isInitialized || !formatter) {
        await initialize();
      }

      if (!formatter) {
        return {
          type: "error",
          message: "Formatter not initialized",
        };
      }

      // Apply config if provided
      if (message.config) {
        formatter.setConfig(
          message.config.global || {
            indentWidth: 2,
            lineWidth: 100,
            newLineKind: "lf",
          },
          message.config.markdown || {},
        );
      }

      const formatted = formatter.formatText({
        filePath: "file.md",
        fileText: message.text,
      });
      return {
        type: "formatted",
        text: formatted,
      };
    }

    return {
      type: "error",
      message: `Unknown message type: ${(message as any).type}`,
    };
  } catch (error) {
    return {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
});