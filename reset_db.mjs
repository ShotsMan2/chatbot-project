import fs from "fs";
import postgres from "postgres";

const env = fs.readFileSync(".env", "utf8");
const dbUrl = env.match(/DATABASE_URL="([^"]+)"/)[1];

async function run() {
  const sql = postgres(dbUrl);
  await sql`DROP SCHEMA public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  console.log("Schema dropped and recreated.");
  process.exit(0);
}

run();
