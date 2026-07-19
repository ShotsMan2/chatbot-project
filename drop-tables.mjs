import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function main() {
  console.log("Dropping tables...");
  try {
    await sql`DROP TABLE IF EXISTS "vendor_products" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "vendors" CASCADE;`;
    console.log("Tables dropped.");
  } catch (err) {
    console.error("Error dropping tables:", err);
  } finally {
    await sql.end();
  }
}

main();
