import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatRequestSchema } from "@/lib/validation/chat";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { ModelNotFoundError, OllamaConnectionError } from "@/lib/ollama/ollama-errors";
import { eq } from "drizzle-orm";
import { ZERO_HALLUCINATION_SYSTEM_PROMPT, INTENT_CLASSIFIER_PROMPT } from "@/lib/orchestrator/prompts";
import { searchProducts } from "@/lib/orchestrator/tools";

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
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
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
      // Create our own AbortController to forward cancellation to Ollama
      const ollamaAbort = new AbortController();

      // If the client disconnects (req.signal aborts), abort Ollama too
      const onClientAbort = () => ollamaAbort.abort();
      req.signal.addEventListener("abort", onClientAbort, { once: true });

      // ================= ORCHESTRATOR LOGIC =================

      let searchResultsStr = "Arama Sonuçları: []";
      
      try {
        const intentStartTime = Date.now();
        // Step 1: Intent Classification
        const intentStream = await ollamaClient.chat({
          model: model, // Using the same model for classification, could be a smaller faster model
          messages: [
            { role: "system", content: INTENT_CLASSIFIER_PROMPT },
            { role: "user", content: lastUserMessage.content }
          ],
          options: { temperature: 0.1, num_ctx: 1024 },
          stream: false, // We need the full response
          signal: ollamaAbort.signal,
        });

        const intentReader = intentStream.getReader();
        const { value: intentValue } = await intentReader.read();
        intentReader.releaseLock();
        
        if (intentValue) {
          const decoder = new TextDecoder();
          const intentResponseStr = decoder.decode(intentValue);
          const lines = intentResponseStr.split("\n").filter(Boolean);
          let parsedIntent: { needsSearch?: boolean, query?: string, category?: string, brand?: string, intent?: string } = {};

          // Extract JSON from response (handling potential markdown formatting)
          for (const line of lines) {
             try {
                const chunk = JSON.parse(line);
                if (chunk.message?.content) {
                   const jsonMatch = chunk.message.content.match(/\{[\s\S]*\}/);
                   if (jsonMatch) {
                      parsedIntent = JSON.parse(jsonMatch[0]);
                   }
                }
             } catch (e) {
                // ignore parsing errors
             }
          }
          console.log(`[Orchestrator] Intent Extraction took ${Date.now() - intentStartTime}ms`);

          // Step 2: Search Products if needed
          if (parsedIntent?.needsSearch) {
             console.log("[Orchestrator] Needs search. Extracted:", parsedIntent);
             const results = await searchProducts({
                query: parsedIntent.query,
                category: parsedIntent.category,
                brand: parsedIntent.brand
             });
             
             if (results.length > 0) {
                 searchResultsStr = "Arama Sonuçları (Search Results): \n" + JSON.stringify(results, null, 2);
             } else {
                 searchResultsStr = "Arama Sonuçları: [Bulunamadı]";
             }
          } else {
             console.log("[Orchestrator] No search needed.");
          }
        }
      } catch (e) {
        console.error("[Orchestrator] Intent classification or search failed:", e);
        // Fallback: If intent fails, do a raw search with the user message as a safety net!
        try {
           const results = await searchProducts({ query: lastUserMessage.content });
           searchResultsStr = "Arama Sonuçları (Search Results): \n" + JSON.stringify(results, null, 2);
        } catch (innerError) {
           console.error("[Orchestrator] Ultimate fallback search failed:", innerError);
        }
      }

      // Step 3: Inject System Prompt and Search Results
      const finalSystemMessage = `${ZERO_HALLUCINATION_SYSTEM_PROMPT}\n\n${searchResultsStr}`;
      
      // Rebuild messages list with the strict system prompt
      const finalMessages = [
        { role: "system" as const, content: finalSystemMessage },
        ...chatMessages.filter(m => m.role !== "system") // Remove any existing system prompts
      ];

      // ================= END ORCHESTRATOR LOGIC =================

      // Step 4: Stream the verified generation
      const ollamaStream = await ollamaClient.chat({
        model,
        messages: finalMessages,
        options: { temperature, num_ctx: contextSize },
        signal: ollamaAbort.signal,
      });

      // Intercept the stream to accumulate the response and save it to DB
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
            req.signal.removeEventListener("abort", onClientAbort);
          }
        },
        cancel() {
          // When the client disconnects / stream is cancelled, abort Ollama
          ollamaAbort.abort();
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
