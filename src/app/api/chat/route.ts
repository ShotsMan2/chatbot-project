import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatRequestSchema } from "@/lib/validation/chat";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { ModelNotFoundError, OllamaConnectionError } from "@/lib/ollama/ollama-errors";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = chatRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request", details: result.error.format() }, { status: 400 });
    }

    const { model, messages: chatMessages, conversationId, temperature, contextSize } = result.data;
    const lastUserMessage = chatMessages[chatMessages.length - 1];

    // If conversationId is provided, make sure it exists
    let convId = conversationId;
    if (convId) {
      const conv = await db.select().from(conversations).where(eq(conversations.id, convId)).get();
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else {
      convId = crypto.randomUUID();
      await db.insert(conversations).values({
        id: convId,
        title: lastUserMessage.content.slice(0, 50) + "...",
        model,
        systemPrompt: "", // Set default if needed
      });
    }

    // Save the user's message
    const userMessageId = crypto.randomUUID();
    await db.insert(messages).values({
      id: userMessageId,
      conversationId: convId,
      role: "user",
      content: lastUserMessage.content,
      status: "completed",
    });

    const assistantMessageId = crypto.randomUUID();
    
    // We will save the assistant message initially as 'pending'
    await db.insert(messages).values({
      id: assistantMessageId,
      conversationId: convId,
      role: "assistant",
      content: "",
      status: "streaming",
    });

    try {
      const ollamaStream = await ollamaClient.chat({
        model,
        messages: chatMessages,
        options: { temperature, num_ctx: contextSize },
        signal: req.signal, // Pass abort signal
      });

      // Intercept the stream to accumulate the response and save it to DB
      const transformStream = new TransformStream({
        start(controller) {
          // You could optionally send an initial event to the client with the message ID
        },
        async transform(chunk, controller) {
          controller.enqueue(chunk);
          // Accumulation is handled in a separate async context or we do it here
          // Since the stream chunks are Uint8Array of JSON strings + \n, we can decode and accumulate
        },
        async flush(controller) {
          // Stream ended
        }
      });

      // Actually, a cleaner way is to Tee the stream or wrap the reader.
      let accumulatedContent = "";
      let totalDuration = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      const decoder = new TextDecoder();
      
      const wrappedStream = new ReadableStream({
        async start(controller) {
          const reader = ollamaStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Save final message to DB
                await db.update(messages).set({
                  content: accumulatedContent,
                  status: "completed",
                  totalDuration,
                  promptTokens,
                  completionTokens
                }).where(eq(messages.id, assistantMessageId));
                
                controller.close();
                break;
              }
              
              if (value) {
                controller.enqueue(value);
                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split("\n").filter(Boolean);
                for (const line of lines) {
                  try {
                    const parsed = JSON.parse(line);
                    if (parsed.message?.content) {
                      accumulatedContent += parsed.message.content;
                    }
                    if (parsed.done) {
                      totalDuration = parsed.total_duration || 0;
                      promptTokens = parsed.prompt_eval_count || 0;
                      completionTokens = parsed.eval_count || 0;
                    }
                  } catch (e) {
                    // ignore parse errors for partial chunks in the interceptor
                    // The client will handle exact parsing
                  }
                }
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              await db.update(messages).set({
                content: accumulatedContent,
                status: "cancelled",
              }).where(eq(messages.id, assistantMessageId));
            } else {
              await db.update(messages).set({
                content: accumulatedContent,
                status: "failed",
              }).where(eq(messages.id, assistantMessageId));
            }
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        },
        cancel() {
          ollamaStream.cancel();
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
      if (error instanceof ModelNotFoundError) {
        return NextResponse.json({ error: error.message, code: "MODEL_NOT_FOUND" }, { status: 404 });
      }
      if (error instanceof OllamaConnectionError) {
        return NextResponse.json({ error: error.message, code: "CONNECTION_ERROR" }, { status: 503 });
      }
      
      await db.update(messages).set({ status: "failed" }).where(eq(messages.id, assistantMessageId));
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
