import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const envPath = resolve(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
} catch {}

async function drop() {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

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

drop().catch(console.error);
