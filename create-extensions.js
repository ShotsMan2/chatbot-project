const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/chatbot",
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Creating extensions...");
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    console.log("Extensions created successfully.");
  } catch (err) {
    console.error("Error creating extensions:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
