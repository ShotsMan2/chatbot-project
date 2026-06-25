import { ChatInput, LlmProvider, ModelInfo } from "./ollama-types";
import {
  OllamaConnectionError,
  ModelNotFoundError,
  OllamaResponseError,
  GenerationCancelledError,
} from "./ollama-errors";
import { parseOllamaStream } from "./stream-parser";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export class OllamaProvider implements LlmProvider {
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new OllamaConnectionError();
      }
      const data = await response.json();
      return (data.models || []).filter((m: any) => !m.name.includes("embed"));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new OllamaConnectionError("Ollama connection timed out");
      }
      throw new OllamaConnectionError();
    }
  }

  async chat(input: ChatInput): Promise<ReadableStream<Uint8Array>> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          stream: input.stream !== false,
          options: input.options,
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404 || errorText.toLowerCase().includes("not found")) {
          throw new ModelNotFoundError(input.model);
        }
        throw new OllamaResponseError(errorText);
      }

      if (!response.body) {
        throw new OllamaResponseError("No response body received from Ollama");
      }

      // Convert the readable stream from fetch (which is Uint8Array chunks)
      // into a stream that yields the final string parts or JSON, 
      // but the interface expects a ReadableStream<Uint8Array> containing the SSE or raw text.
      // We will parse it and then stream the parsed content to the client properly formatted.
      // Since Next.js Route Handlers typically stream text via StringStream or similar,
      // let's create a TransformStream.

      const encoder = new TextEncoder();
      const iterator = parseOllamaStream(response.body);

      const stream = new ReadableStream({
        async pull(controller) {
          try {
            const { value, done } = await iterator.next();
            if (done) {
              controller.close();
              return;
            }
            // value is OllamaChatResponseChunk
            controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
          } catch (error) {
            controller.error(error);
          }
        },
        cancel() {
          iterator.return?.();
        }
      });

      return stream;

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new GenerationCancelledError();
      }
      throw err;
    }
  }
}

export const ollamaClient = new OllamaProvider();
