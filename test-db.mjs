import postgres from 'postgres';
const sql = postgres('postgres://postgres:ChatbotAdmin2026!@localhost:5432/chatbot');
try {
  const rows = await sql`SELECT * FROM products`;
  console.log('Products count:', rows.length);
  for (const p of rows) {
    console.log(p.id, p.name, p.price);
  }
  await sql.end();
} catch (e) {
  console.error('DB Error:', e.message);
}
