import { redis } from "@/infrastructure/redis/redis-client";
import { db } from "@/lib/db";
import { memories } from "@/lib/db/schema";
import { Message } from "../MainOrchestrator";
import { sql } from "drizzle-orm";

export class MemoryAgent {
  /**
   * Saves short-term conversation context in Redis.
   */
  static async saveShortTermMemory(sessionId: string, messages: Message[]) {
    if (!redis) return;
    try {
      // Keep only last 20 messages to prevent token bloat
      const recentMessages = messages.slice(-20);
      await redis.set(`session:${sessionId}:messages`, JSON.stringify(recentMessages));
      // Expiration: 24 hours
      await redis.pipeline().expire(`session:${sessionId}:messages`, 60 * 60 * 24).exec();
    } catch (e) {
      console.error("Redis save error:", e);
    }
  }

  /**
   * Retrieves short-term memory from Redis.
   */
  static async getShortTermMemory(sessionId: string): Promise<Message[]> {
    if (!redis) return [];
    try {
      const data = await redis.get<string>(`session:${sessionId}:messages`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Redis get error:", e);
      return [];
    }
  }

  /**
   * Extracts and saves long-term user preferences (budget, sizes, favorite brands).
   * This would typically be run in the background (e.g., via queue) after a conversation ends or periodically.
   */
  static async extractAndSaveLongTermMemory(userId: string, messages: Message[]) {
    // In a real system, we would prompt a small LLM to summarize user preferences:
    // e.g. "Extract facts: User likes Nike, wears size 42, budget is max 3000TL"
    // For now, we mock the extraction process.
    
    // Example Drizzle insertion for a semantic fact
    /*
    await db.insert(memories).values({
      userId,
      type: "long_term",
      content: "User prefers dark colors and wears size 42 for shoes.",
    });
    */
  }

  /**
   * Retrieves long-term user profile facts from PostgreSQL.
   */
  static async getLongTermProfile(userId: string): Promise<string> {
    if (!userId) return "No user profile.";
    
    try {
      const userMemories = await db.query.memories.findMany({
        where: sql`${memories.userId} = ${userId} AND ${memories.type} = 'long_term'`,
        limit: 10,
        orderBy: (m, { desc }) => [desc(m.createdAt)]
      });

      if (userMemories.length === 0) return "New customer, no known preferences.";

      return userMemories.map(m => `- ${m.content}`).join("\n");
    } catch (e) {
      console.error("DB Memory error:", e);
      return "";
    }
  }
}
