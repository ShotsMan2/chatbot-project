import { NextRequest, NextResponse } from "next/server";
import { MainOrchestrator } from "@/application/orchestrator/MainOrchestrator";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/infrastructure/redis/rate-limiter";
import { MemoryAgent } from "@/application/orchestrator/agents/MemoryAgent";

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
    // 1. Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rl = await rateLimit(`chat_ip_${ip}`, 10, 60); // 10 msgs / 60 seconds
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers });
    }

    const { messages: reqMessages, sessionId, model } = await req.json();

    if (!reqMessages || !Array.isArray(reqMessages) || reqMessages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400, headers });
    }

    let convId = sessionId || crypto.randomUUID();

    // Ensure session ID is added to headers for frontend to persist
    const responseHeaders = new Headers(headers);
    responseHeaders.set("X-Session-Id", convId);

    // 2. Fetch/Save short term context
    await MemoryAgent.saveShortTermMemory(convId, reqMessages);

    // 3. Main Orchestration
    const stream = await MainOrchestrator.handleChat({
      messages: reqMessages,
      userProfile: { userId: "anonymous" }, // Mock user
      signal: req.signal,
      model: model || "qwen2.5-coder",
    });

    // 4. Return Data Stream Response directly (BFF Proxy)
    return new NextResponse(stream as any, {
      headers: {
        ...Object.fromEntries(responseHeaders.entries()),
        "Content-Type": "application/x-ndjson",
      },
    });

  } catch (error) {
    console.error("[Widget Chat API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500, headers });
  }
}

