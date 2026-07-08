import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DefaultLogger, LogWriter } from "drizzle-orm/logger";
import * as schema from "./schema";

class CustomLogger implements LogWriter {
  write(message: string) {
    // Custom logic to log queries and observe latency
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Drizzle-DB] ${message}`);
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/chatbot",
  max: 20, // Connection pool size for scalability
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const logger = new DefaultLogger({ writer: new CustomLogger() });

export const db = drizzle(pool, { schema, logger });
