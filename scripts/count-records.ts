import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting to count records in all tables...\n");

  const tables = [
    "conversations",
    "messages",
    "settings",
    "agenticTasks",
    "sentimentLogs",
    "neuralCommerceSessions",
    "products",
    "carts",
    "cartItems",
    "orders",
    "users",
    "coupons",
    "reviews",
    "returns",
    "b2bQuotes",
    "subscriptions",
    "wishlists",
    "wishlistItems",
    "flashSales",
    "groupBuys",
    "groupBuyParticipants",
    "negotiations",
    "dynamicPricingRules",
    "faqs",
    "supportTickets",
    "analyticsEvents",
    "giftRegistries",
    "giftContributions",
    "userQuests",
    "userWardrobes",
    "exclusiveDrops",
    "customManufacturingRequests",
    "aiGeneratedDesigns",
    "bespokeMeasurements",
    "tryAtHomeRequests",
    "vipConciergeSessions",
    "clientStyleDna",
    "theVaultProducts",
    "whiteGloveServices",
    "oneOfOneRequests",
    "productArAssets",
    "web3Wallets",
    "nftAssets",
    "spatialSessions",
    "digitalCertificates",
    "hyperlocalNodes",
    "brandEvents",
    "brandAmbassadorApplications",
    "brandHeritageArchives",
  ];

  for (const tableName of tables) {
    try {
      const table = (schema as any)[tableName];
      if (!table) {
        console.warn(`Table ${tableName} not found in schema.`);
        continue;
      }
      
      const result = await db.select({ count: sql`count(*)` }).from(table);
      const count = Number(result[0]?.count ?? 0);
      console.log(`- ${tableName}: ${count}`);
    } catch (err) {
      console.error(`Error counting ${tableName}:`, err);
    }
  }

  console.log("\nFinished counting all tables.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
