export async function* parseOllamaStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<any, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // The last element is either an empty string (if the buffer ended with \n)
      // or a partial JSON string. We keep it in the buffer.
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          yield parsed;
        } catch (e) {
          console.warn("Failed to parse stream line:", trimmed, e);
          // If JSON parse fails, it means the chunk might be corrupt or we split it improperly.
          // However, we strictly split on \n, and NDJSON guarantees \n at the end of each valid object.
        }
      }
    }

    // Process any remaining data in the buffer after the stream ends
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        yield parsed;
      } catch (e) {
        console.warn("Failed to parse final stream line:", buffer, e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
