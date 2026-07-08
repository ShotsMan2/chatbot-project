import { Message } from "../MainOrchestrator";

export type Intent = "product_search" | "faq" | "order_status" | "general_chat";

export interface IntentResult {
  intent: Intent;
  confidence: number;
  extractedKeywords?: string[];
  category?: string;
  brand?: string;
  budget?: number;
}

export class RouterAgent {
  /**
   * Analyzes the conversation history to determine the user's intent.
   * This represents the "Intent Classifier" part of the orchestrator.
   */
  static async determineIntent(messages: Message[], model: string = "qwen2.5-coder"): Promise<IntentResult> {
    const systemPrompt = `You are the Intent Classifier for a world-class e-commerce chatbot.
Your job is to analyze the user's latest message in the context of the conversation and determine what they want.

You must respond with a JSON object containing:
- "intent": one of ["product_search", "faq", "order_status", "general_chat"]
- "confidence": a number between 0 and 1
- "extractedKeywords": array of important search terms (optional)
- "category": the product category they are looking for (optional)
- "brand": the brand they are looking for (optional)
- "budget": max budget if they mentioned one (optional)

Rules:
- If they ask for recommendations, specific items, "do you have X?", or prices -> "product_search"
- If they ask about shipping, returns, company info, payment methods -> "faq"
- If they ask "where is my order", "did it ship" -> "order_status"
- Otherwise, casual chat -> "general_chat"
`;

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages
          ],
          format: "json",
          stream: false,
          options: {
            temperature: 0.1
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.message?.content || "{}";

      let result = JSON.parse(text) as IntentResult;

      // Wildcard standardization for Turkish characters
      if (result.extractedKeywords && Array.isArray(result.extractedKeywords)) {
        result.extractedKeywords = result.extractedKeywords.map(kw => 
          kw.replace(/[ışğçöüIŞĞÇÖÜ]/g, "_")
        );
      }

      return result;
    } catch (e) {
      console.error("RouterAgent parse error:", e);
      // Fallback
      return { intent: "general_chat", confidence: 0 };
    }
  }
}
