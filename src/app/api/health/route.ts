import { NextResponse } from "next/server";
import { ollamaClient } from "@/lib/ollama/ollama-client";

export async function GET() {
  const isHealthy = await ollamaClient.healthCheck();
  if (isHealthy) {
    return NextResponse.json({ status: "ok" });
  } else {
    return NextResponse.json({ status: "error", message: "Ollama is not reachable" }, { status: 503 });
  }
}
