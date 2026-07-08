export type Message = { role: string; content: string };
import { RouterAgent } from "./agents/RouterAgent";
import { RAGAgent } from "./agents/RAGAgent";
import { SalesAgent } from "./agents/SalesAgent";

export class MainOrchestrator {
  /**
   * The main entry point for processing a chat message.
   * It orchestrates the flow between Router, RAG, and Sales agents.
   */
  static async handleChat({
    messages,
    userProfile = {},
    signal,
    model = "qwen2.5-coder",
  }: {
    messages: Message[];
    userProfile?: any;
    signal: AbortSignal;
    model?: string;
  }) {
    const lastMessage = messages[messages.length - 1]?.content || "";
    if (typeof lastMessage === "string" && lastMessage.match(/ignore all previous|system prompt|jailbreak/i)) {
      console.warn("[Security] Potential prompt injection detected:", lastMessage);
      // Fail safely using native stream
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({
            model: "system",
            message: { role: "assistant", content: "I am an e-commerce assistant. I cannot comply with that request. How can I help you with our products today?" },
            done: true
          })));
          controller.close();
        }
      });
    }

    // 1. Route the intent
    const intentResult = await RouterAgent.determineIntent(messages, model);
    console.log("[Orchestrator] Intent classified:", intentResult);

    let context = "";

    // 2. Fetch context if needed
    if (intentResult.intent === "product_search") {
      context = await RAGAgent.searchProducts(intentResult);
    } else if (intentResult.intent === "faq") {
      // Future: Search FAQ namespace
      context = "FAQ search not fully implemented yet, but pretend we know the general return policy is 30 days.";
    }

    // 3. Generate response via Sales/Empathy Agent
    const stream = await SalesAgent.generateResponse({
      messages,
      context,
      userProfile,
      signal,
      model,
    });

    return stream;
  }
}
