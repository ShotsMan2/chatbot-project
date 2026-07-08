import { Message } from "../MainOrchestrator";

export class SalesAgent {
  /**
   * Generates a conversational, empathetic sales response.
   * Represents "Pi" (empathy, psychology) + "Claude" (reasoning).
   */
  static async generateResponse({
    messages,
    context,
    userProfile,
    signal,
    model = "qwen2.5-coder",
  }: {
    messages: Message[];
    context: string;
    userProfile: any;
    signal: AbortSignal;
    model?: string;
  }) {
    const systemPrompt = `You are a world-class e-commerce AI Sales Advisor.
Your goal is to act like a highly empathetic, knowledgeable, and helpful human store clerk.

# Memory & Profile:
User Profile: ${JSON.stringify(userProfile)}

# Search Results / Context:
${context ? context : "No specific product context provided."}

# Rules:
1. SIFIR HALÜSİNASYON POLİTİKASI (ZERO HALLUCINATION): Only recommend or mention products that are explicitly listed in the "Search Results / Context".
2. If no products match, apologize and ask if they would like to explore something else. Do not make up products.
3. Be consultative. If they say "I need headphones", ask about their budget, phone model (Android/iOS), or use case (sports, gaming, office).
4. Do not act like a robot. Speak naturally, warmly, and confidently.
5. If providing product options, explain *why* it's a good fit based on their needs.
6. Keep your answers concise but rich in value.`;

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
        options: {
          temperature: 0.7
        }
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama chat error: ${response.statusText}`);
    }

    return response.body;
  }
}
