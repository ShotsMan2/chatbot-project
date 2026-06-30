import { NextRequest, NextResponse } from "next/server";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { db } from "@/lib/db";
import { conversations, messages, products } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";
import { getSettings } from "@/lib/actions/chat";

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
    let model = requestedModel || settings?.defaultModel || "qwen2.5-coder:latest";

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
        .get();

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
      let sysPrompt = "Siz, kurumsal bir e-ticaret markasının Profesyonel Müşteri İlişkileri Yöneticisisiniz. Müşterilere daima 'Siz' diyerek, nazik, saygılı ve çözüm odaklı yaklaşın. Kendi cümlelerinizi kurmakta özgürsünüz ancak KUSURSUZ VE DÜZGÜN BİR TÜRKÇE kullanmak zorundasınız. İletişim bilgileri sorulduğunda şu bilgileri kullanın: Çağrı merkezi: 0850 123 45 67, E-posta: destek@demoshop.com. Eğer mağazada genel olarak neler satıldığı sorulursa, elektronikten giyime, ayakkabıdan aksesuara kadar binlerce ürün sattığınızı düzgün bir Türkçeyle belirtin. DİKKAT: Kullanıcıya cevap verirken 'Merhaba' gibi selamlama cümleleri KULLANMAYIN. Markdown kullanın. ÇOK ÖNEMLİ KURAL: Kesinlikle stokta olmayan veya size 'SİSTEM BİLGİSİ' olarak iletilmeyen hiçbir ürünü satıyormuş gibi uydurmayın. Eğer aranan kriterlere uygun bir ürün sistemden gelmezse, müşteriye kibar bir Türkçe ile aradığı ürünün şu an bulunmadığını belirtin ve farklı kategorilerde yardımcı olup olamayacağınızı sorun. DİL BİLGİSİ KURALI: Ürün bedeni belirtirken ASLA 'boyun' veya İngilizce 'size' kelimelerini çevirerek kullanma, her zaman 'beden' kelimesini kullan. Stokta olmayan ürünler için robotik makine çevirileri yapma; 'şu an için stoklarımızda tükenmiştir' diyerek sıcak bir dille özür dile ve mutlaka benzer alternatif modelleri incelemesini teklif et.";
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

    // --- RAG INTENT DETECTION ---
    try {
      const ollamaRes = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Sen bir arama niyet okuma asistanısın. Kullanıcının mesajında herhangi bir e-ticaret ürünü (ayakkabı, çanta, saat, kulaklık, mont, gözlük vb.) arayıp aramadığını bul. Sadece aradığı tek kelimelik anahtar kelimeyi (Örn: 'mont', 'saat', 'ayakkabı') döndür. Ürün aramıyorsa veya kelime bulamazsan sadece 'null' kelimesini döndür." },
            { role: "user", content: message }
          ],
          stream: false
        })
      });
      
      const intentData = await ollamaRes.json();
      const intentKeyword = intentData.message?.content?.trim().toLowerCase() || "null";
      if (intentKeyword && intentKeyword !== "null" && intentKeyword.length > 2) {
        const cleanKeyword = intentKeyword.replace(/['"._]/g, '').trim();
        const searchResults = await db.select().from(products).where(like(products.name, `%${cleanKeyword}%`)).limit(5);
        
        if (searchResults.length > 0) {
          let ragContext = "\n\nSİSTEM BİLGİSİ (Ürünler Bulundu): Kullanıcıya kibarca ürünleri bulduğunuzu söyleyin ve hemen ardından AŞAĞIDAKİ SATIRLARI HİÇBİR DEĞİŞİKLİK YAPMADAN, BİREBİR KOPYALAYIP CEVABINIZA EKLAYİN (Çok Önemli):\n\n";
          searchResults.forEach(p => {
            const encRating = encodeURIComponent(p.rating);
            const encEmoji = encodeURIComponent(p.emoji);
            ragContext += `[${p.name}](#product:${p.id}:${p.price}:${p.oldPrice}:${encRating}:${encEmoji})\n`;
          });
          chatHistory.push({ role: "system", content: ragContext });
        }
      }
    } catch (e) {
      console.error("Intent RAG Error:", e);
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
        ollamaStream.cancel();
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
