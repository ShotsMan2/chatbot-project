import { expect, test, describe } from "vitest";
import { parseOllamaStream } from "../lib/ollama/stream-parser";

describe("parseOllamaStream", () => {
  test("parses NDJSON stream correctly", async () => {
    const encoder = new TextEncoder();
    
    // Create a stream that emits chunks properly
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"model":"test","message":{"role":"assistant","content":"Hel"}}\n'));
        controller.enqueue(encoder.encode('{"model":"test","message":{"role":"assistant","content":"lo"}}\n'));
        controller.enqueue(encoder.encode('{"done":true}\n'));
        controller.close();
      }
    });

    const iterator = parseOllamaStream(stream);
    const results = [];
    for await (const chunk of iterator) {
      results.push(chunk);
    }

    expect(results).toHaveLength(3);
    expect(results[0].message.content).toBe("Hel");
    expect(results[1].message.content).toBe("lo");
    expect(results[2].done).toBe(true);
  });

  test("handles JSON chunks split across network boundaries", async () => {
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"model":"test","message":{"role":"assis'));
        controller.enqueue(encoder.encode('tant","content":"Hello"}}\n{"done":t'));
        controller.enqueue(encoder.encode('rue}\n'));
        controller.close();
      }
    });

    const iterator = parseOllamaStream(stream);
    const results = [];
    for await (const chunk of iterator) {
      results.push(chunk);
    }

    expect(results).toHaveLength(2);
    expect(results[0].message.content).toBe("Hello");
    expect(results[1].done).toBe(true);
  });
});
