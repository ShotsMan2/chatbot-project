const { createClient } = require('@libsql/client');
const { Client } = require('pg');

async function migrateData() {
  const sqliteDb = createClient({ url: 'file:sqlite.db' });
  
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:ChatbotAdmin2026!@localhost:5432/chatbot'
  });

  try {
    await pgClient.connect();
    console.log("Connected to PostgreSQL");

    // 1. Migrate Products
    const productsRes = await sqliteDb.execute('SELECT * FROM products');
    const products = productsRes.rows;
    if (products.length > 0) {
      console.log(`Migrating ${products.length} products...`);
      for (const p of products) {
        await pgClient.query(
          `INSERT INTO products (id, name, price, old_price, rating, emoji, sizes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, price = EXCLUDED.price, old_price = EXCLUDED.old_price, 
           rating = EXCLUDED.rating, emoji = EXCLUDED.emoji, sizes = EXCLUDED.sizes`,
          [p.id, p.name, p.price, p.old_price, p.rating, p.emoji, p.sizes]
        );
      }
      await pgClient.query(`SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))`);
    }

    // 2. Migrate Settings
    const settingsRes = await sqliteDb.execute('SELECT * FROM settings');
    const settings = settingsRes.rows;
    if (settings.length > 0) {
      console.log(`Migrating settings...`);
      for (const s of settings) {
        const lastCleanupAt = s.last_cleanup_at ? new Date(Number(s.last_cleanup_at) * 1000) : null;
        await pgClient.query(
          `INSERT INTO settings (id, default_model, default_system_prompt, temperature, context_size, last_cleanup_at, last_cleanup_count) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.default_model, s.default_system_prompt, s.temperature, s.context_size, lastCleanupAt, s.last_cleanup_count]
        );
      }
    }

    // 3. Migrate Conversations
    const conversationsRes = await sqliteDb.execute('SELECT * FROM conversations');
    const conversations = conversationsRes.rows;
    if (conversations.length > 0) {
      console.log(`Migrating ${conversations.length} conversations...`);
      for (const c of conversations) {
        const createdAt = new Date(c.created_at);
        const updatedAt = new Date(c.updated_at);
        await pgClient.query(
          `INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, c.title, c.model, c.system_prompt, createdAt, updatedAt]
        );
      }
    }

    // 4. Migrate Messages
    const messagesRes = await sqliteDb.execute('SELECT * FROM messages');
    const messages = messagesRes.rows;
    if (messages.length > 0) {
      console.log(`Migrating ${messages.length} messages...`);
      for (const m of messages) {
        const createdAt = new Date(m.created_at);
        const updatedAt = new Date(m.updated_at);
        await pgClient.query(
          `INSERT INTO messages (id, conversation_id, role, content, status, prompt_tokens, completion_tokens, total_duration, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [m.id, m.conversation_id, m.role, m.content, m.status, m.prompt_tokens, m.completion_tokens, m.total_duration, createdAt, updatedAt]
        );
      }
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pgClient.end();
  }
}

migrateData();
