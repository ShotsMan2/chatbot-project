import cron from "node-cron";
import { isCleanupDue, runCleanup } from "@/lib/cleanup";

export function startCleanupCron() {
  cron.schedule("0 0 */3 * *", async () => {
    console.log("[Cleanup] Scheduled cleanup triggered");
    try {
      const result = await runCleanup();
      if (result.deletedCount > 0) {
        console.log(`[Cleanup] ${result.deletedCount} eski konuşma silindi`);
      } else {
        console.log("[Cleanup] Temizlik gerektiren konuşma bulunamadı");
      }
    } catch (error) {
      console.error("[Cleanup] Scheduled cleanup failed:", error);
    }
  });

  (async () => {
    try {
      if (await isCleanupDue()) {
        console.log("[Cleanup] Server startup cleanup triggered");
        const result = await runCleanup();
        if (result.deletedCount > 0) {
          console.log(`[Cleanup] ${result.deletedCount} eski konuşma silindi`);
        }
      }
    } catch (error) {
      console.error("[Cleanup] Startup cleanup failed:", error);
    }
  })();
}
