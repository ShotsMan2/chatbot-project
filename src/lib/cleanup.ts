import { db } from "@/lib/db";
import { conversations, settings } from "@/lib/db/schema";
import { lt } from "drizzle-orm";
import { updateLastCleanup } from "@/lib/actions/chat";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function isCleanupDue(): Promise<boolean> {
  const setting = await db.select().from(settings).where(lt(settings.id, 2)).limit(1).then((res) => res[0]);
  if (!setting?.lastCleanupAt) return true;
  return Date.now() - setting.lastCleanupAt.getTime() >= THREE_DAYS_MS;
}

export async function runCleanup(): Promise<{ deletedCount: number }> {
  const cutoff = new Date(Date.now() - THREE_DAYS_MS);

  const oldConvs = await db.select({ id: conversations.id })
    .from(conversations)
    .where(lt(conversations.updatedAt, cutoff));

  if (oldConvs.length === 0) {
    await updateLastCleanup(0);
    return { deletedCount: 0 };
  }

  await db.delete(conversations).where(lt(conversations.updatedAt, cutoff));

  await updateLastCleanup(oldConvs.length);
  return { deletedCount: oldConvs.length };
}

export async function getCleanupInfo(): Promise<{ lastCleanupAt: Date | null; lastCleanupCount: number | null } | null> {
  const setting = await db.select().from(settings).where(lt(settings.id, 2)).limit(1).then((res) => res[0]);
  if (!setting?.lastCleanupAt) return null;
  return {
    lastCleanupAt: setting.lastCleanupAt,
    lastCleanupCount: setting.lastCleanupCount,
  };
}
