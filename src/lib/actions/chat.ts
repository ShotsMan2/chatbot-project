"use server";

import { db } from "@/lib/db";
import { conversations, messages, settings } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getConversations() {
  return await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
}

export async function getConversation(id: string) {
  const conv = await db.select().from(conversations).where(eq(conversations.id, id)).get();
  return conv || null;
}

export async function getMessages(conversationId: string) {
  return await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function deleteConversation(id: string) {
  await db.delete(conversations).where(eq(conversations.id, id));
  revalidatePath("/");
}

export async function clearAllConversations() {
  await db.delete(conversations);
  revalidatePath("/");
}

export async function getSettings() {
  let setting = await db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!setting) {
    await db.insert(settings).values({ id: 1 }).execute();
    setting = await db.select().from(settings).where(eq(settings.id, 1)).get();
  }
  return setting;
}

export async function updateSettings(data: Partial<typeof settings.$inferInsert>) {
  await db.update(settings).set(data).where(eq(settings.id, 1));
  revalidatePath("/");
}
