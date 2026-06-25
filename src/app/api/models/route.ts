import { NextResponse } from "next/server";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { OllamaConnectionError } from "@/lib/ollama/ollama-errors";

export async function GET() {
  try {
    const models = await ollamaClient.listModels();
    return NextResponse.json({ models });
  } catch (error) {
    if (error instanceof OllamaConnectionError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
