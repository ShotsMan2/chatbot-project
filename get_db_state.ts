import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./src/lib/db/schema";
import * as fs from "fs";

async function main() {
  const result: any = {};
  try {
    const client = postgres("postgres://postgres:ChatbotAdmin2026!@localhost:5432/chatbot");
    const db = drizzle(client, { schema });
    
    result.products = await db.select().from(schema.products);
    result.faqs = await db.select().from(schema.faqs);
    result.brand_events = await db.select().from(schema.brandEvents);
    // result.conversations = await db.select().from(schema.conversations); // Too long
    result.carts = await db.select().from(schema.carts);
    result.orders = await db.select().from(schema.orders);
    result.users = await db.select().from(schema.users);
    result.digital_certificates = await db.select().from(schema.digitalCertificates);
    result.the_vault_products = await db.select().from(schema.theVaultProducts);
    result.white_glove_services = await db.select().from(schema.whiteGloveServices);
    
    fs.writeFileSync("db_state.json", JSON.stringify(result, null, 2));
    console.log("State written to db_state.json");
  } catch (error: any) {
    console.error("DB Error:", error);
  }
  process.exit(0);
}
main();
