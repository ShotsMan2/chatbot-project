import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { IntentResult } from "./RouterAgent";

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateKeywordScore(product: any, keywords: string[]): number {
  if (!keywords || keywords.length === 0) return 0;
  const searchableText = `${product.name} ${product.category || ""} ${product.brand || ""} ${product.description || ""}`.toLowerCase();
  
  let score = 0;
  for (const kw of keywords) {
    const term = kw.toLowerCase().replace(/_/g, ""); // Remove wildcard standardizations if any
    if (term.length > 2 && searchableText.includes(term)) {
      score += 0.5; // Bump score for keyword matches
    }
  }
  return score;
}

export class RAGAgent {
  /**
   * Performs a hybrid search (Vector + BM25 conceptual fallback) in Javascript
   * bypassing the need for pgvector extension which might be missing on Windows.
   */
  static async searchProducts(intent: IntentResult): Promise<string> {
    if (!intent.extractedKeywords || intent.extractedKeywords.length === 0) {
      if (!intent.category && !intent.brand) {
        return "User did not specify any search parameters.";
      }
    }

    const searchQuery = [
      ...((intent.extractedKeywords) || []),
      intent.category || "",
      intent.brand || ""
    ].filter(Boolean).join(" ");

    if (!searchQuery) return "No search query generated.";

    try {
      // 1. Generate embedding for the query using Ollama
      let queryEmbedding: number[] | null = null;
      try {
        const response = await fetch("http://localhost:11434/api/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "nomic-embed-text",
            prompt: searchQuery,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          queryEmbedding = data.embedding;
        }
      } catch (e) {
        console.warn("Ollama embedding fetch failed. Proceeding with keyword search only.");
      }

      // 2. Fetch all active products
      const allProducts = await db.query.products.findMany({
        where: sql`(${products.status} = 'active')`,
      });

      // 3. Compute scores in Javascript
      const scoredProducts = allProducts.map((p: any) => {
        let similarity = 0;
        
        // Try Vector Similarity if both embeddings exist
        if (queryEmbedding && p.embedding) {
          try {
            let pEmbed = typeof p.embedding === 'string' ? JSON.parse(p.embedding) : p.embedding;
            if (Array.isArray(pEmbed) && pEmbed.length === queryEmbedding.length) {
              similarity = cosineSimilarity(queryEmbedding, pEmbed);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Add keyword score as fallback/hybrid component
        const kwScore = calculateKeywordScore(p, intent.extractedKeywords || []);
        
        // Final score (Vector takes precedence, but keywords boost)
        const finalScore = similarity > 0 ? similarity + (kwScore * 0.1) : kwScore;
        
        return { ...p, finalScore };
      });

      // Filter and sort
      scoredProducts.sort((a, b) => b.finalScore - a.finalScore);
      // Threshold: Either they have a decent vector similarity (>0.3) or at least 1 keyword match (>0.4)
      const validResults = scoredProducts.filter(p => p.finalScore > 0.3).slice(0, 5);

      if (validResults.length === 0) {
        return "Arama sonucunda veritabanında uygun ürün bulunamadı.";
      }

      // 4. Format context for the SalesAgent
      const contextLines = validResults.map(p => {
        return `[PRODUCT ID: ${p.id}]
Name: ${p.name}
Brand: ${p.brand || "Bilinmiyor"}
Category: ${p.category || "Bilinmiyor"}
Price: ${p.price || p.priceValue || "Fiyat yok"}
Stock: ${p.stock > 0 ? "Stokta Var (" + p.stock + " adet)" : "Tükendi"}
Description: ${p.description || "Yok"}
Variants/Sizes: ${p.sizes || "Standart"}
---`;
      });

      return `FOUND PRODUCTS:\n${contextLines.join("\n")}`;
    } catch (error) {
      console.error("RAG Search Error:", error);
      return "An error occurred while searching the product database. Tell the user we are experiencing technical difficulties.";
    }
  }
}

