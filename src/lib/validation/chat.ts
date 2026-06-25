import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(20000),
});

export const chatRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  conversationId: z.string().uuid().optional(),
  temperature: z.number().min(0).max(2).optional(),
  contextSize: z.number().int().positive().optional(),
});
