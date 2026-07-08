
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  await sql`DROP SCHEMA public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  console.log("Schema dropped and recreated.");
  process.exit(0);
}

run();
