export async function* parseOllamaStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<any, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  let inJsonBlock = false;
  let jsonBuffer = "";
  let blockType = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          
          if (parsed.message?.content) {
            const content = parsed.message.content;
            
            // Check for start of JSON block
            if (!inJsonBlock && content.includes("```json-")) {
              const match = content.match(/```json-([a-z]+)/);
              if (match) {
                inJsonBlock = true;
                blockType = match[1];
                jsonBuffer = content.split(/```json-[a-z]+/).pop() || "";
                
                // If it also closes in the same chunk
                if (jsonBuffer.includes("```")) {
                  inJsonBlock = false;
                  const jsonStr = jsonBuffer.split("```")[0];
                  try {
                    const data = JSON.parse(jsonStr);
                    yield { type: blockType, data };
                  } catch(e) {}
                  jsonBuffer = "";
                }
                
                // Yield the text part before the block
                const textBefore = content.split(/```json-[a-z]+/)[0];
                if (textBefore) {
                  yield { ...parsed, message: { ...parsed.message, content: textBefore } };
                }
                continue;
              }
            } else if (inJsonBlock) {
              jsonBuffer += content;
              if (jsonBuffer.includes("```")) {
                inJsonBlock = false;
                const jsonStr = jsonBuffer.split("```")[0];
                try {
                  const data = JSON.parse(jsonStr);
                  yield { type: blockType, data };
                } catch(e) {}
                
                const textAfter = jsonBuffer.split("```")[1] || "";
                if (textAfter) {
                  yield { ...parsed, message: { ...parsed.message, content: textAfter } };
                }
                jsonBuffer = "";
              }
              continue; // Do not yield the raw content while inside JSON block
            }
          }

          yield parsed;
        } catch (e) {
          console.warn("Failed to parse stream line:", trimmed, e);
        }
      }
    }

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
