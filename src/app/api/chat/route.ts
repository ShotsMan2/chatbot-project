import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatRequestSchema } from "@/lib/validation/chat";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { db } from "@/lib/db";
import { conversations, messages, products } from "@/lib/db/schema";
import { ECOMMERCE_ORCHESTRATOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { ModelNotFoundError, OllamaConnectionError } from "@/lib/ollama/ollama-errors";
import { eq, ilike } from "drizzle-orm";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Veritabanındaki e-ticaret ürünlerini arar ve filtreler.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "Aranacak ürün kelimesi (örn: çanta, saat, deri)"
          }
        },
        required: ["keyword"]
      }
    }
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = chatRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request", details: result.error.format() }, { status: 400 });
    }

    const { model, messages: chatMessages, conversationId, temperature, contextSize } = result.data;
    const lastUserMessage = chatMessages[chatMessages.length - 1];

    let convId = conversationId;
    if (convId) {
      const conv = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1).then((res) => res[0]);
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else {
      convId = crypto.randomUUID();
      await db.insert(conversations).values({
        id: convId,
        title: lastUserMessage.content.slice(0, 50) + "...",
        model,
        systemPrompt: ECOMMERCE_ORCHESTRATOR_SYSTEM_PROMPT,
      });
    }

    const userMessageId = crypto.randomUUID();
    await db.insert(messages).values({
      id: userMessageId,
      conversationId: convId,
      role: "user",
      content: lastUserMessage.content,
      status: "completed",
    });

    const assistantMessageId = crypto.randomUUID();
    
    await db.insert(messages).values({
      id: assistantMessageId,
      conversationId: convId,
      role: "assistant",
      content: "",
      status: "streaming",
    });

    try {
      const ollamaAbort = new AbortController();
      const onClientAbort = () => ollamaAbort.abort();
      req.signal.addEventListener("abort", onClientAbort, { once: true });

      const messagesWithSystem = [
        { role: "system", content: ECOMMERCE_ORCHESTRATOR_SYSTEM_PROMPT },
        ...chatMessages.filter((m: any) => m.role !== "system")
      ] as import("@/lib/ollama/ollama-types").ChatMessage[];

      const wrappedStream = new ReadableStream({
        async start(controller) {
          try {
            let isToolCalling = true;
            let runMessages = [...messagesWithSystem];
            let accumulatedContent = "";
            let totalDuration = 0;
            let promptTokens = 0;
            let completionTokens = 0;
            const decoder = new TextDecoder();

            while (isToolCalling) {
              const stream = await ollamaClient.chat({
                model,
                messages: runMessages,
                options: { temperature, num_ctx: contextSize },
                tools: TOOLS,
                signal: ollamaAbort.signal,
              });

              const reader = stream.getReader();
              let streamHasToolCall = false;
              let currentToolCalls: any[] = [];
              let currentAssistantContent = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split("\n").filter(Boolean);
                
                for (const line of lines) {
                  try {
                    const parsed = JSON.parse(line);
                    if (parsed.message?.tool_calls && parsed.message.tool_calls.length > 0) {
                      streamHasToolCall = true;
                      for (const tc of parsed.message.tool_calls) {
                        currentToolCalls.push(tc);
                      }
                    } else if (parsed.message?.content) {
                      currentAssistantContent += parsed.message.content;
                      if (!streamHasToolCall) {
                        accumulatedContent += parsed.message.content;
                      }
                    }
                    if (parsed.done) {
                      totalDuration += parsed.total_duration || 0;
                      promptTokens += parsed.prompt_eval_count || 0;
                      completionTokens += parsed.eval_count || 0;
                    }
                  } catch (e) {
                    // ignore parse errors for partial chunks in the interceptor
                  }
                }

                if (!streamHasToolCall && value) {
                  controller.enqueue(value);
                }
              }
              reader.releaseLock();

              if (streamHasToolCall && currentToolCalls.length > 0) {
                 runMessages.push({ 
                   role: "assistant", 
                   content: currentAssistantContent, 
                   tool_calls: currentToolCalls 
                 } as any);
                 
                 for (const tc of currentToolCalls) {
                   if (tc.function.name === "search_products") {
                     const args = tc.function.arguments;
                     const keyword = args.keyword || "";
                     const cleanKeyword = keyword.replace(/['"._]/g, '').trim();
                     let productsData: any[] = [];
                     
                     if (cleanKeyword.length > 2) {
                       const searchResults = await db.select()
                         .from(products)
                         .where(ilike(products.name, `%${cleanKeyword}%`))
                         .limit(10);
                       productsData = searchResults.map(p => ({
                         name: p.name,
                         price: p.price,
                         sizes: p.sizes,
                         emoji: p.emoji
                       }));
                     }

                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({
                         products: productsData
                       })
                     });
                   }
                 }
              } else {
                 isToolCalling = false;
                 
                 await db.update(messages).set({
                   content: accumulatedContent,
                   status: "completed",
                   totalDuration,
                   promptTokens,
                   completionTokens
                 }).where(eq(messages.id, assistantMessageId));
                 
                 controller.close();
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              await db.update(messages).set({
                status: "cancelled",
              }).where(eq(messages.id, assistantMessageId));
            } else {
              await db.update(messages).set({
                status: "failed",
              }).where(eq(messages.id, assistantMessageId));
            }
            controller.error(error);
          } finally {
            req.signal.removeEventListener("abort", onClientAbort);
          }
        },
        cancel() {
           ollamaAbort.abort();
        }
      });

      return new Response(wrappedStream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "X-Conversation-Id": convId,
          "X-Message-Id": assistantMessageId
        }
      });

    } catch (error) {
      console.error("[Chat API] Ollama error:", error);
      if (error instanceof ModelNotFoundError) {
        return NextResponse.json({ error: error.message, code: "MODEL_NOT_FOUND" }, { status: 404 });
      }
      if (error instanceof OllamaConnectionError) {
        return NextResponse.json({ error: error.message, code: "CONNECTION_ERROR" }, { status: 503 });
      }
      
      await db.update(messages).set({ status: "failed" }).where(eq(messages.id, assistantMessageId));
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
  } catch (error) {
    console.error("[Chat API] Request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
