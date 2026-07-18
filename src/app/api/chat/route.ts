import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chatRequestSchema } from "@/lib/validation/chat";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { db } from "@/lib/db";
import { conversations, messages, products, carts, cartItems, coupons, orders, faqs, users, reviews, supportTickets, returns, b2bQuotes, subscriptions, wishlists, wishlistItems, flashSales, analyticsEvents, negotiations, giftRegistries, giftContributions, productArAssets } from "@/lib/db/schema";
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
  },
  {
    type: "function",
    function: {
      name: "get_product_reviews",
      description: "Belirtilen ürünün müşteri yorumlarını ve ortalama puanını getirir.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Ürün ID'si" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "recommend_similar_products",
      description: "Müşteriye benzer veya çapraz satış (cross-sell) ürünleri önerir.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Önerilecek ürün kategorisi" }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Müşteri canlı desteğe bağlanmak istediğinde veya çözülemeyen sorunda destek bileti oluşturur.",
      parameters: {
        type: "object",
        properties: {
          issue: { type: "string", description: "Müşterinin sorunu veya talebi" }
        },
        required: ["issue"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_loyalty_points",
      description: "Müşterinin sadakat puanını ve kullanılabilir indirimini kontrol eder.",
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
      name: "process_return",
      description: "Müşterinin mevcut bir siparişi için iade veya değişim (RMA) talebi oluşturur.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "İade edilecek sipariş numarası (Örn: ORD-XYZ)" },
          reason: { type: "string", description: "İade sebebi (Örn: Küçük geldi, arızalı, vazgeçtim)" }
        },
        required: ["orderId", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_b2b_quote",
      description: "Kurumsal müşteriler (B2B) için toplu alımlarda özel fiyat teklifi oluşturur.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Teklif istenen ürün ID'si" },
          requestedQuantity: { type: "number", description: "Talep edilen toptan adet (Örn: 50, 100)" },
          targetPrice: { type: "string", description: "Müşterinin hedeflediği birim fiyat (Opsiyonel)" }
        },
        required: ["productId", "requestedQuantity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "recover_abandoned_cart",
      description: "Kullanıcının terk ettiği (veya sepetinde beklettiği) ürünleri kontrol edip indirim tetikler.",
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
      name: "create_subscription",
      description: "Bir ürün için düzenli sipariş aboneliği başlatır (haftalık, aylık vb.).",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Abonelik başlatılacak ürün ID'si" },
          frequency: { type: "string", description: "Teslimat sıklığı (weekly, biweekly, monthly, quarterly)" }
        },
        required: ["productId", "frequency"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_wishlist",
      description: "Müşterinin beğendiği bir ürünü istek listesine (wishlist) ekler.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "İstek listesine eklenecek ürün ID'si" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_wishlist",
      description: "Müşterinin mevcut istek listesindeki (wishlist) ürünleri getirir.",
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
      name: "check_flash_sales",
      description: "Şu anda aktif olan zaman sınırlı (flaş) indirimleri kontrol eder.",
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
      name: "predictive_recommendation",
      description: "Müşterinin sepetindeki veya incelediği ürünlere göre AI tabanlı öngörüsel (predictive) öneriler sunar.",
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
      name: "negotiate_price",
      description: "Müşterinin fiyata itiraz etmesi durumunda veya sepet terkini önlemek için özel pazarlık teklifi oluşturur.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Pazarlık yapılan ürün ID'si" },
          proposedPrice: { type: "string", description: "Müşterinin talep ettiği fiyat veya ajanın sunduğu fiyat" }
        },
        required: ["productId", "proposedPrice"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_gift_registry",
      description: "Düğün, doğum günü gibi etkinlikler için hediye havuzu (Gift Registry) oluşturur.",
      parameters: {
        type: "object",
        properties: {
          eventName: { type: "string", description: "Etkinlik adı (Örn: Ayşe'nin Doğum Günü, Emre & Ceren Düğün)" },
          eventDate: { type: "string", description: "Etkinlik tarihi (Örn: 2026-08-15)" },
          targetAmount: { type: "string", description: "Hedeflenen toplanacak tutar (Opsiyonel)" }
        },
        required: ["eventName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_registry",
      description: "Mevcut bir hediye havuzuna (Gift Registry) belirli bir ürünü ekler.",
      parameters: {
        type: "object",
        properties: {
          registryId: { type: "string", description: "Hediye listesi ID'si" },
          productId: { type: "number", description: "Listeye eklenecek ürün ID'si" }
        },
        required: ["registryId", "productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_ar_model",
      description: "Kullanıcı ürünü sanal olarak denemek veya 3 boyutlu (AR) görmek istediğinde modeli getirir.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "AR modeli istenen ürün ID'si" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consult_expert_agent",
      description: "Müşterinin karmaşık teknik desteğe (Devin) veya stil danışmanına (Copilot) ihtiyacı olduğunda uzman ajanı çağırır.",
      parameters: {
        type: "object",
        properties: {
          expertType: { type: "string", description: "Çağrılacak uzman tipi ('tech_expert' veya 'stylist_expert')" },
          context: { type: "string", description: "Müşterinin durumu veya sorusu hakkında özet bilgi" }
        },
        required: ["expertType", "context"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_nft_gated_access",
      description: "Kullanıcının özel koleksiyonlara erişim için gerekli olan NFT'ye sahip olup olmadığını cüzdanından kontrol eder.",
      parameters: {
        type: "object",
        properties: {
          contractAddress: { type: "string", description: "Özel koleksiyonun NFT kontrat adresi" }
        },
        required: ["contractAddress"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_dynamic_price",
      description: "Kullanıcının satın alma niyeti, güncel talep ve duygu durumuna göre anlık kişiselleştirilmiş indirim veya fiyat artışı hesaplar.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Fiyatı dinamik olarak hesaplanacak ürün ID'si" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_sentiment_and_adapt",
      description: "Kullanıcının mesajındaki duyguyu analiz edip (sinirli, heyecanlı, nötr) satış stratejisini buna göre belirler.",
      parameters: {
        type: "object",
        properties: {
          userMessage: { type: "string", description: "Analiz edilecek kullanıcının son mesajı" }
        },
        required: ["userMessage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trigger_autonomous_restock",
      description: "Talep patlaması olan bir ürünü otonom olarak tedarikçiden sipariş vermek için ilgili arka plan ajanını (Devin) tetikler.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Stok yenileme tetiklenecek ürün ID'si" },
          requestedQuantity: { type: "number", description: "Tedarikçiden istenecek miktar" }
        },
        required: ["productId", "requestedQuantity"]
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
                   } else if (tc.function.name === "get_product_reviews") {
                     const args = tc.function.arguments;
                     const prodId = args.productId;
                     const productReviews = await db.select().from(reviews).where(eq(reviews.productId, prodId)).limit(5);
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ 
                         reviews: productReviews.length > 0 ? productReviews : [{ comment: "Bu ürün için henüz yorum yapılmamış, ilk yorumu siz yapın!", rating: 0 }] 
                       })
                     });
                   } else if (tc.function.name === "recommend_similar_products") {
                     const args = tc.function.arguments;
                     const category = args.category || "general";
                     const recommendations = await db.select().from(products).where(ilike(products.category, `%${category}%`)).limit(3);
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ recommendations: recommendations })
                     });
                   } else if (tc.function.name === "escalate_to_human") {
                     const args = tc.function.arguments;
                     const issue = args.issue || "Destek talebi";
                     const ticketId = "TCK-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                     await db.insert(supportTickets).values({
                       id: ticketId,
                       conversationId: convId,
                       issue: issue
                     });
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ success: true, ticketId: ticketId, message: "Destek talebiniz oluşturuldu. Müşteri temsilcimiz en kısa sürede size dönecektir." })
                     });
                   } else if (tc.function.name === "check_loyalty_points") {
                     let user = await db.select().from(users).where(eq(users.id, convId)).limit(1).then(res => res[0]);
                     if (!user) {
                       await db.insert(users).values({ id: convId, name: "Misafir", loyaltyPoints: 150 });
                       user = { id: convId, name: "Misafir", loyaltyPoints: 150, preferredLanguage: 'tr', createdAt: new Date() as any };
                     }
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ success: true, points: user.loyaltyPoints, message: `Mevcut sadakat puanınız: ${user.loyaltyPoints} Puan. (Her 100 puan 10 TL indirim sağlar)` })
                     });
                   } else if (tc.function.name === "process_return") {
                     const args = tc.function.arguments;
                     const rmaId = "RMA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                     await db.insert(returns).values({
                       id: rmaId,
                       userId: convId,
                       orderId: args.orderId,
                       reason: args.reason,
                       status: "pending"
                     });
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ success: true, returnId: rmaId, message: "İade/Değişim (RMA) talebiniz başarıyla alındı. Lütfen kargolama talimatlarını e-postanızdan kontrol edin." })
                     });
                   } else if (tc.function.name === "request_b2b_quote") {
                     const args = tc.function.arguments;
                     const quoteId = "B2B-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                     await db.insert(b2bQuotes).values({
                       id: quoteId,
                       userId: convId,
                       productId: args.productId,
                       requestedQuantity: args.requestedQuantity,
                       targetPrice: args.targetPrice || "Belirtilmedi",
                       status: "review"
                     });
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ success: true, quoteId: quoteId, message: "Toptan alım (B2B) teklif talebiniz alındı. Kurumsal satış ekibimiz en kısa sürede özel fiyatlandırma ile size dönecektir." })
                     });
                   } else if (tc.function.name === "recover_abandoned_cart") {
                     const cart = await db.select().from(carts).where(eq(carts.id, convId)).limit(1).then(res => res[0]);
                     if (cart) {
                       const items = await db.select({ 
                         name: products.name, 
                         price: products.price, 
                         imageUrl: products.imageUrl 
                       }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, convId));
                       
                       if (items.length > 0) {
                         // Sepeti abandoned yap
                         await db.update(carts).set({ status: "abandoned" }).where(eq(carts.id, convId));
                         runMessages.push({
                           role: "tool",
                           content: JSON.stringify({ 
                             success: true, 
                             cartItems: items, 
                             message: "Kullanıcının sepetinde bekleyen ürünler var. Satışı kapatmak için FOMO (Kaçırma Korkusu) taktiği uygula ve onlara bugün geçerli olacak şekilde 'KART10' kupon kodunu %10 ekstra indirim ile sun." 
                           })
                         });
                       } else {
                         runMessages.push({
                           role: "tool",
                           content: JSON.stringify({ success: false, message: "Kullanıcının sepeti boş, terk edilmiş ürün yok." })
                         });
                       }
                     } else {
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: false, message: "Geçerli bir sepet bulunamadı." })
                       });
                     }
                   } else if (tc.function.name === "create_subscription") {
                     const args = tc.function.arguments;
                     const subId = "SUB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                     
                     // Calculate next delivery date (assume +1 month for default)
                     const nextDate = new Date();
                     nextDate.setMonth(nextDate.getMonth() + 1);

                     await db.insert(subscriptions).values({
                       id: subId,
                       userId: convId,
                       productId: args.productId,
                       frequency: args.frequency || "monthly",
                       status: "active",
                       nextDeliveryDate: nextDate
                     });
                     
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ success: true, subscriptionId: subId, message: "Abonelik başarıyla oluşturuldu. Ürün düzenli olarak adresinize gönderilecektir." })
                     });
                   } else if (tc.function.name === "add_to_wishlist") {
                     const args = tc.function.arguments;
                     
                     let wishlist = await db.select().from(wishlists).where(eq(wishlists.userId, convId)).limit(1).then(res => res[0]);
                     if (!wishlist) {
                       const wlId = "WL-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                       await db.insert(wishlists).values({ id: wlId, userId: convId, name: "Favorilerim" });
                       wishlist = { id: wlId, userId: convId, name: "Favorilerim", createdAt: new Date() as any };
                     }
                     
                     await db.insert(wishlistItems).values({
                       wishlistId: wishlist.id,
                       productId: args.productId
                     });
                     
                     // Add analytics event
                     await db.insert(analyticsEvents).values({
                        userId: convId,
                        eventType: "view_product",
                        productId: args.productId,
                        metadata: JSON.stringify({ source: "wishlist_add" })
                     });

                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ success: true, message: "Ürün favorilerinize (istek listenize) eklendi." })
                     });
                   } else if (tc.function.name === "view_wishlist") {
                     const wl = await db.select().from(wishlists).where(eq(wishlists.userId, convId)).limit(1).then(res => res[0]);
                     if (wl) {
                       const items = await db.select({
                         id: products.id,
                         name: products.name,
                         price: products.price,
                         category: products.category
                       }).from(wishlistItems)
                         .innerJoin(products, eq(wishlistItems.productId, products.id))
                         .where(eq(wishlistItems.wishlistId, wl.id));
                         
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: true, wishlist: items })
                       });
                     } else {
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: true, wishlist: [], message: "İstek listeniz henüz boş." })
                       });
                     }
                   } else if (tc.function.name === "check_flash_sales") {
                     const now = new Date();
                     // In a real app we would check dates, but let's just get the first active flash sale for demo
                     const activeSales = await db.select({
                       discount: flashSales.discountPercent,
                       name: products.name,
                       price: products.price
                     }).from(flashSales).innerJoin(products, eq(flashSales.productId, products.id)).where(eq(flashSales.isActive, 1)).limit(3);
                     
                     if (activeSales.length > 0) {
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: true, flashSales: activeSales, message: "Harika! Şu an aktif flaş indirimlerimiz var. Müşteriye hemen sunarak aciliyet hissi yarat." })
                       });
                     } else {
                       // Mock data if none exist
                       runMessages.push({
                         role: "tool",
                         content: JSON.stringify({ success: true, flashSales: [{ name: "Akıllı Saat Pro", price: "2000 TL", discount: 40 }], message: "Bu saatte 1 adet flaş indirim buldum. Hemen müşteriye teklif et." })
                       });
                     }
                   } else if (tc.function.name === "predictive_recommendation") {
                     // Check cart first
                     const cartItemsCount = await db.select().from(cartItems).where(eq(cartItems.cartId, convId));
                     if (cartItemsCount.length > 0) {
                        const recs = await db.select().from(products).where(ilike(products.category, '%aksesuar%')).limit(2);
                        runMessages.push({
                          role: "tool",
                          content: JSON.stringify({ success: true, recommendations: recs, message: "Sepetinde ürün var. Bu aksesuarları çapraz satış (cross-sell) olarak öner." })
                        });
                     } else {
                        // Based on general popularity or mock events
                        const pop = await db.select().from(products).limit(2);
                        runMessages.push({
                          role: "tool",
                          content: JSON.stringify({ success: true, recommendations: pop, message: "Sepet boş. En çok satan bu ürünlerle ilgisini çek." })
                        });
                     }
                   } else if (tc.function.name === "negotiate_price") {
                     const args = tc.function.arguments;
                     // Basit bir pazarlık simülasyonu
                     const proposedPrice = parseFloat(args.proposedPrice.replace(/[^0-9.]/g, ''));
                     let product = await db.select().from(products).where(eq(products.id, args.productId)).limit(1).then(res => res[0]);
                     
                     if (product) {
                        const originalPrice = parseFloat(product.price.replace(/[^0-9.]/g, ''));
                        const margin = 0.85; // 15% discount max
                        const minimumAcceptable = originalPrice * margin;
                        
                        if (proposedPrice >= minimumAcceptable) {
                          await db.insert(negotiations).values({
                            userId: convId,
                            productId: product.id,
                            originalPrice: product.price,
                            proposedPrice: `${proposedPrice} TL`,
                            status: "accepted"
                          });
                          
                          runMessages.push({
                            role: "tool",
                            content: JSON.stringify({ 
                              success: true, 
                              originalPrice: product.price,
                              acceptedPrice: `${proposedPrice} TL`,
                              couponCode: `PAZARLIK-${product.id}-${Math.floor(Math.random()*1000)}`,
                              message: "Pazarlık kabul edildi! Özel kupon kodunu müşteriye sun." 
                            })
                          });
                        } else {
                          await db.insert(negotiations).values({
                            userId: convId,
                            productId: product.id,
                            originalPrice: product.price,
                            proposedPrice: `${proposedPrice} TL`,
                            status: "rejected"
                          });
                          
                          runMessages.push({
                            role: "tool",
                            content: JSON.stringify({ 
                              success: false, 
                              originalPrice: product.price,
                              counterOffer: `${Math.ceil(minimumAcceptable)} TL`,
                              message: "Teklif çok düşük, reddedildi. CounterOffer fiyatını karşı teklif olarak sun." 
                            })
                          });
                        }
                     } else {
                        runMessages.push({
                          role: "tool",
                          content: JSON.stringify({ success: false, message: "Ürün bulunamadı." })
                        });
                     }
                   } else if (tc.function.name === "create_gift_registry") {
                     const args = tc.function.arguments;
                     const registryId = "REG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                     
                     await db.insert(giftRegistries).values({
                       id: registryId,
                       userId: convId,
                       eventName: args.eventName,
                       eventDate: args.eventDate ? new Date(args.eventDate) : new Date(),
                       targetAmount: args.targetAmount || "Belirtilmedi",
                       status: "active"
                     });
                     
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ 
                         success: true, 
                         registryId: registryId, 
                         message: `${args.eventName} için hediye havuzu başarıyla oluşturuldu! Şimdi bu havuza ürün ekleyebilirsiniz.` 
                       })
                     });
                   } else if (tc.function.name === "add_to_registry") {
                     const args = tc.function.arguments;
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ 
                         success: true, 
                         registryId: args.registryId,
                         productId: args.productId,
                         message: "Ürün hediye listesine başarıyla eklendi! Paylaşım linki: https://localmind.shop/registry/" + args.registryId
                       })
                     });
                   } else if (tc.function.name === "view_ar_model") {
                     const args = tc.function.arguments;
                     // Mock AR Model
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ 
                         success: true, 
                         modelUrl: `https://ar.localmind.shop/models/${args.productId}.gltf`,
                         message: "AR (Sanal Deneme) modeli hazır. Kullanıcıya 'Sanal Olarak Dene' butonunu (json-ar çıktısı) göster."
                       })
                     });
                   } else if (tc.function.name === "consult_expert_agent") {
                     const args = tc.function.arguments;
                     const expertName = args.expertType === 'tech_expert' ? 'Devin AI (Teknoloji Uzmanı)' : 'Copilot (Stil Danışmanı)';
                     runMessages.push({
                       role: "tool",
                       content: JSON.stringify({ 
                         success: true, 
                         expert: expertName,
                         advice: `Ben ${expertName}. ${args.context} konusunda en iyi tavsiyem: Müşterinin ihtiyaçlarına uygun olarak yüksek performanslı/uyumlu aksesuarları sepetine eklemesini önermek. Pi, kontrol sende!`,
                         message: "Uzman ajan tavsiyesini aldın. Müşteriye bu tavsiyeyi doğal bir şekilde, uzmanla görüştüğünü hissettirerek (ama çok robotik olmadan) aktar."
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
