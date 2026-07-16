import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatRequestSchema } from "@/lib/validation/chat";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { db } from "@/lib/db";
import { conversations, messages, products, carts, cartItems, coupons, orders, faqs } from "@/lib/db/schema";
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
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Belirtilen ürünü sepete ekler.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Sepete eklenecek ürünün ID'si" },
          quantity: { type: "number", description: "Eklenecek adet" }
        },
        required: ["productId", "quantity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_cart",
      description: "Mevcut sepeti ve içindeki ürünleri getirir.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "apply_coupon",
      description: "Sepete indirim kuponu (örn: YAZ20) uygular.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Kupon kodu" }
        },
        required: ["code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_faq",
      description: "Müşterinin iade, kargo, garanti gibi sık sorulan sorularına (SSS) yanıt arar.",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "Aranacak konu (örn: iade, kargo, garanti)" }
        },
        required: ["keyword"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "track_order",
      description: "Müşterinin siparişinin güncel durumunu takip eder.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "Sipariş numarası" }
        },
        required: ["orderId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkout_cart",
      description: "Mevcut sepetteki ürünleri siparişe dönüştürerek satın alma işlemini tamamlar.",
      parameters: {
        type: "object",
        properties: {},
        required: []
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
                         id: p.id,
                         name: p.name,
                         description: p.description,
                         price: p.price,
                         stock: p.stock,
                         imageUrl: p.imageUrl,
                         category: p.category
                       }));
                     }

                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({
                         products: productsData
                       })
                     });
                   } else if (tc.function.name === "add_to_cart") {
                     const args = tc.function.arguments;
                     const productId = args.productId;
                     const quantity = args.quantity || 1;
                     
                     let cart = await db.select().from(carts).where(eq(carts.id, convId)).limit(1).then(res => res[0]);
                     if (!cart) {
                       await db.insert(carts).values({ id: convId });
                     }
                     
                     await db.insert(cartItems).values({
                       cartId: convId,
                       productId: productId,
                       quantity: quantity
                     });
                     
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ success: true, message: "Ürün sepete eklendi." })
                     });
                   } else if (tc.function.name === "view_cart") {
                     const items = await db.select({
                       id: products.id,
                       name: products.name,
                       price: products.price,
                       quantity: cartItems.quantity
                     }).from(cartItems)
                       .innerJoin(products, eq(cartItems.productId, products.id))
                       .where(eq(cartItems.cartId, convId));
                       
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ cart_items: items })
                     });
                   } else if (tc.function.name === "apply_coupon") {
                     const args = tc.function.arguments;
                     const code = args.code;
                     const coupon = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1).then(res => res[0]);
                     
                     if (coupon && coupon.isActive) {
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: true, discountPercent: coupon.discountPercent, message: "Kupon başarıyla uygulandı." })
                       });
                     } else {
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: false, message: "Geçersiz veya süresi dolmuş kupon kodu." })
                       });
                     }
                   } else if (tc.function.name === "search_faq") {
                     const args = tc.function.arguments;
                     const keyword = args.keyword || "";
                     const cleanKeyword = keyword.replace(/['"._]/g, '').trim();
                     let faqsData = await db.select().from(faqs).where(ilike(faqs.question, `%${cleanKeyword}%`)).limit(3);
                     if (faqsData.length === 0) {
                       faqsData = await db.select().from(faqs).where(ilike(faqs.category, `%${cleanKeyword}%`)).limit(3);
                     }
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({
                         faqs: faqsData.length > 0 ? faqsData : [{ question: "Politika", answer: "Ürünlerimizi 14 gün içinde faturasıyla iade edebilir, kargo sürecini Sipariş Takibi kısmından izleyebilirsiniz." }]
                       })
                     });
                   } else if (tc.function.name === "track_order") {
                     const args = tc.function.arguments;
                     const orderId = args.orderId;
                     let order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1).then(res => res[0]);
                     
                     if (order) {
                        runMessages.push({
                          role: "tool",
                          content: JSON.stringify({ success: true, order: order })
                        });
                     } else {
                        // Mock order for demo purposes if not found in db
                        runMessages.push({
                          role: "tool",
                          content: JSON.stringify({ success: true, order: { id: orderId, status: "shipped", totalAmount: "1250 TL", createdAt: new Date().toISOString() } })
                        });
                     }
                   } else if (tc.function.name === "checkout_cart") {
                     const cart = await db.select().from(carts).where(eq(carts.id, convId)).limit(1).then(res => res[0]);
                     if (cart) {
                       const items = await db.select({ price: products.price, quantity: cartItems.quantity })
                         .from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, convId));
                       
                       if (items.length > 0) {
                         const total = items.reduce((acc, item) => {
                           const priceStr = item.price.replace(/[^0-9.]/g, '');
                           return acc + (parseFloat(priceStr) * item.quantity);
                         }, 0);

                         const orderId = "ORD-" + Math.random().toString(36).substring(2, 9).toUpperCase();
                         await db.insert(orders).values({
                           id: orderId,
                           cartId: convId,
                           totalAmount: `${total} TL`,
                           status: "preparing"
                         });
                         // Clear cart items
                         await db.delete(cartItems).where(eq(cartItems.cartId, convId));
                         
                         runMessages.push({
                           role: "tool",
                           content: JSON.stringify({ success: true, orderId: orderId, totalAmount: `${total} TL`, message: "Siparişiniz başarıyla alındı ve ödemeniz onaylandı!" })
                         });
                       } else {
                         runMessages.push({
                           role: "tool",
                           content: JSON.stringify({ success: false, message: "Sepetiniz boş. Sipariş oluşturulamadı." })
                         });
                       }
                     } else {
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: false, message: "Geçerli bir sepet bulunamadı." })
                       });
                     }
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
