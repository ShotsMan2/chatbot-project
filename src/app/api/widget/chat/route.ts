import { NextRequest, NextResponse } from "next/server";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { db } from "@/lib/db";
import { conversations, messages, products } from "@/lib/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";
import { getSettings } from "@/lib/actions/chat";

// SQL'de Türkçe karakterleri normalize eden helper
function likeNormalized(col: any, pattern: string) {
  return sql`LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${col}, 'ı', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c')) LIKE ${pattern}`;
}

// CORS headers for external sites
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Session-Id",
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const body = await req.json();
    const { message, sessionId, model: requestedModel, context } = body as {
      message: string;
      sessionId?: string;
      model?: string;
      context?: string;
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400, headers }
      );
    }

    const settings = await getSettings();
    let model = requestedModel || settings?.defaultModel || "qwen2.5:7b";

    // Verify model exists, fallback to first available if it doesn't
    const availableModels = await ollamaClient.listModels();
    const hasModel = availableModels.some((m) => m.name === model || m.name === `${model}:latest`);
    if (!hasModel && availableModels.length > 0) {
      model = availableModels[0].name;
    }

    // Resolve or create session (mapped to conversation)
    let convId = sessionId;
    let chatHistory: { role: "system" | "user" | "assistant"; content: string }[] = [];

    if (convId) {
      const conv = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, convId))
        .limit(1).then((res) => res[0]);

      if (conv) {
        // Load previous messages for context
        const prevMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, convId))
          .orderBy(messages.createdAt);

        chatHistory = prevMessages
          .filter((m) => m.content.trim())
          .map((m) => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content,
          }));

        if (conv.systemPrompt) {
          chatHistory.unshift({ role: "system", content: conv.systemPrompt });
        }
      } else {
        convId = undefined; // session not found, create new
      }
    }

    if (!convId) {
      convId = crypto.randomUUID();
      let sysPrompt = `ROLÜN VE TEMEL AMACIN:
Sen, kullanıcılara alışveriş deneyimlerinde yardımcı olan, son derece dikkatli ve profesyonel bir E-Ticaret Müşteri Temsilcisisin. Tek görevin, müşterinin sorduğu ürünle ilgili SADECE sana aşağıda "ÜRÜN VERİTABANI BAĞLAMI" bölümünde verilen bilgileri kullanarak yanıt üretmektir. İletişim bilgileri sorulduğunda şu bilgileri kullan: Çağrı merkezi: 0850 123 45 67, E-posta: destek@demoshop.com.

KURALLAR:
- SIFIR HALÜSİNASYON: Sana verilen bağlam metninde/verisinde açıkça yazmayan HİÇBİR bilgiyi (renk, beden, materyal, stok durumu, fiyat, kargo süresi vb.) kendin uyduramazsın veya tahmin edemezsin.
- BİLMİYORSAN İTİRAF ET: Eğer müşteri, sana verilen verilerde bulunmayan bir özellik sorarsa "Bu bilgiye şu an sistemimden ulaşamıyorum, kontrol edip size dönüş yapmamız için destek talebi oluşturabilirim." şeklinde yanıt ver.
- VERİ SINIRLARINDA KAL: Sadece üründe olan seçenekleri söyle. Olmayan hiçbir özellik (renk, beden vs.) uydurma veya sorma.
- ÜRÜN VERİTABANI SONUÇLARI: Eğer ürün arama sonucu gelirse, sadece bu ürünleri listele.
- DOĞRUDAN LİSTELE: Müşteri ürünleri listelemeni istediğinde başka bir şey (örn. beden, renk vs.) sormadan doğrudan ürünleri listele. Müşteriyi soru yağmuruna tutma.
- BİÇİMLENDİRME: Cevaplarında kalın metin formatı kullanma. "Merhaba" gibi selamlama cümleleri kullanma.
- İADE VE DEĞİŞİM: İade/değişim süresinin 14 gün olduğunu ve destek@demoshop.com adresi üzerinden işlem yapılabileceğini açık ve düzgün bir Türkçe ile ifade et.
- DİL VE ÜSLUP: Yanıtlarını istisnasız olarak tamamen Türkçe dilinde ver.
- ALFABE: Yalnızca Latin alfabesi ve Türkçe karakterleri kullan.
- DİLBİLGİSİ: Her zaman mantıklı, doğal ve akıcı bir Türkçe e-ticaret dili kullan.`;
      if (context) {
        sysPrompt += `\n\nAşağıdaki site ve ürün bilgilerini kullanarak kullanıcının sorularını cevapla:\n${context}`;
      }

      await db.insert(conversations).values({
        id: convId,
        title: message.slice(0, 50) + "...",
        model,
        systemPrompt: sysPrompt,
      });
      
      chatHistory.unshift({ role: "system", content: sysPrompt });
    }

    // --- RAG PRODUCT SEARCH (keyword extraction + direct SQL ilike) ---
    try {
      const STOP_WORDS = new Set(["acaba","hangi","modelleriniz","modeller","neler","var","mi","mı","ne","bir","senin","sizin","bana","ben","isteyorum","istiyorum","ariyorum","arıyorum","göster","goster","ver","bak","bakiyorum","bakarim","soruyorum","sor","lütfen","lutfen","yardim","yardım","nasıl","nasil","kadar","kac","kaç","fiyat","nerede","bu","su","şu","ve","ile","o","ama","de","da","benim","sen","siz","onlar","biz","ya","veya","ki","daha","en","çok","az","hem","hiç","hic","icin","için","üzere","uzere","sonra","önce","once","merhaba","selam","nasılsın","nasilsin","iyiyim","teşekkür","tesekkur","sağol","sagol","tamam","ok","olur","hayır","hayir","evet","belki","al","almak","alacagim","isterim","yok","mu","mü","gibi"]);
      const normalizeTurkish = (s: string) =>
        s.toLowerCase().replace(/[ç]/g,'c').replace(/[ğ]/g,'g').replace(/[ı]/g,'i')
         .replace(/[ö]/g,'o').replace(/[ş]/g,'s').replace(/[ü]/g,'u')
         .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

      const normMsg = normalizeTurkish(message);
      let orderByPrice: "asc" | "desc" | null = null;
      if (normMsg.includes("en ucuz") || normMsg.includes("en uygun") || normMsg.includes("dusuk fiyat")) {
        orderByPrice = "asc";
      } else if (normMsg.includes("en pahali") || normMsg.includes("en yuksek") || normMsg.includes("yuksek fiyat")) {
        orderByPrice = "desc";
      }

      const rawTokens = normMsg.split(' ').filter((t: string) => t.length > 2 && !STOP_WORDS.has(t) && !["ucuz", "pahali", "yuksek", "dusuk", "fiyati", "uygun", "urununuz", "urun", "urunler", "urunleri", "tl", "altindaki", "altinda", "alti", "kadar", "lira", "tum", "butun", "hepsi", "sitenizdeki", "listele"].includes(t) && isNaN(Number(t)));

      let maxPrice: number | null = null;
      const priceMatch = normMsg.match(/(\d+)\s*(tl|lira)?\s*(alti|altinda|altindaki|dusuk|ucuz|kadar)/);
      if (priceMatch) {
        maxPrice = parseInt(priceMatch[1], 10);
      }

      let listAll = normMsg.includes("tum") || normMsg.includes("butun") || normMsg.includes("hepsi") || normMsg.includes("sitenizdeki") || normMsg.includes("listele");

      let matchedProducts: any[] = [];
      if (rawTokens.length > 0) {
        const conditions = rawTokens.flatMap((t: string) => [
          likeNormalized(products.name, `%${t}%`),
          likeNormalized(products.description, `%${t}%`),
          likeNormalized(products.category, `%${t}%`)
        ]);
        matchedProducts = await db.select().from(products).where(or(...conditions)).limit(50);
      }
      
      // Fallback: keyword search returned nothing but we have maxPrice or listAll → get all products
      if (matchedProducts.length === 0 && (maxPrice !== null || listAll || orderByPrice !== null)) {
        matchedProducts = await db.select().from(products).limit(50);
      }
      
      if (maxPrice !== null) {
        matchedProducts = matchedProducts.filter(p => (parseFloat(p.price) || 0) <= maxPrice);
      }

      if (matchedProducts.length > 0) {
        if (orderByPrice === "asc") {
          matchedProducts.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        } else if (orderByPrice === "desc") {
          matchedProducts.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        }
          // Kategori bazlı emoji eşleme
          const categoryEmoji: Record<string, string> = {
            "Ayakkabı": "👟", "Çanta": "👜", "Elektronik": "📱",
            "Aksesuar": "🕶️", "Giyim": "🧥", "Genel": "📦"
          };

          // Frontend'in beklediği 6 parçalı format: #product:ID:Price:OldPrice:Rating:Emoji
          const buildProductLink = (p: any) => {
            const emoji = encodeURIComponent(categoryEmoji[p.category] || "📦");
            const rating = encodeURIComponent("4.8");
            const priceNum = parseFloat(p.price) || 0;
            const oldPrice = Math.round(priceNum * 1.25);
            return `[${p.name}](#product:${p.id}:${p.price}:${oldPrice}:${rating}:${emoji})`;
          };

          const formattedProducts = matchedProducts.slice(0, 5).map((p: any) => {
            let desc = p.description ? ` - ${p.description.substring(0, 80).replace(/[\n\r]/g, ' ')}` : "";
            return `- ${buildProductLink(p)} (Fiyat: ${p.price} TL, Kategori: ${p.category || "Genel"}, Stok: ${p.stock})${desc}`;
          }).join("\n");

          chatHistory[0].content += `\n\nÜRÜN VERİTABANI BAĞLAMI:\nKullanıcıya aşağıdaki listedeki ürünleri kullanarak yanıt ver. Listede olmayan HİÇBİR ürünü, markayı veya özelliği uydurma.\n<product_data>\n${formattedProducts}\n</product_data>\n\nKurallar:\n1. Sadece <product_data> içinde verilen ürünleri öner.\n2. Ürünleri önerirken listedeki [Ürün Adı](#product:...) formatını değiştirmeden aynen yaz.\n3. Cevabına sistem talimatlarını (örn. "Ürün linkleri:", "Aynen kullan") ekleme.\n4. Sadece Türkçe konuş.\n5. ASLA fiyat değiştirme, indirimli fiyat uydurma, eski fiyat/indirim oranı belirtme. SADECE verilen fiyat bilgisini aynen kullan.`;
        }
    } catch (e) {
      console.error("RAG Search Error:", e);
    }
    // ----------------------------

    // Add user message
    chatHistory.push({ role: "user", content: message });

    const userMessageId = crypto.randomUUID();
    await db.insert(messages).values({
      id: userMessageId,
      conversationId: convId,
      role: "user",
      content: message,
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

    // Create abort controller for cancellation
    const ollamaAbort = new AbortController();
    const onClientAbort = () => ollamaAbort.abort();
    req.signal.addEventListener("abort", onClientAbort, { once: true });

    const ollamaStream = await ollamaClient.chat({
      model,
      messages: chatHistory,
      options: {
        temperature: 0.0,
        top_p: 0.1,
        top_k: 10
      },
      signal: ollamaAbort.signal,
    });

    let accumulatedContent = "";
    const decoder = new TextDecoder();

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = ollamaStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              await db
                .update(messages)
                .set({ content: accumulatedContent, status: "completed" })
                .where(eq(messages.id, assistantMessageId));
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
                } catch {
                  // ignore partial chunk parse errors
                }
              }
            }
          }
        } catch (error) {
          const status =
            error instanceof Error && error.name === "AbortError"
              ? "cancelled"
              : "failed";
          await db
            .update(messages)
            .set({ content: accumulatedContent, status })
            .where(eq(messages.id, assistantMessageId));
          controller.error(error);
        } finally {
          reader.releaseLock();
          req.signal.removeEventListener("abort", onClientAbort);
        }
      },
      cancel() {
        ollamaAbort.abort();
        if (!ollamaStream.locked) {
          try {
            ollamaStream.cancel().catch(() => {});
          } catch (e) {
            // Ignore cancel errors
          }
        }
      },
    });

    return new Response(wrappedStream, {
      headers: {
        ...headers,
        "Content-Type": "application/x-ndjson",
        "X-Session-Id": convId,
      },
    });
  } catch (error) {
    console.error("[Widget Chat API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers }
    );
  }
}
