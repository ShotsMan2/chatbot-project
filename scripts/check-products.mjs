import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
const rows = await sql`SELECT * FROM products`;
console.log('Products count:', rows.length);
rows.forEach(p => console.log(`  #${p.id}: ${p.name} | ${p.category} | ${p.price}TL | stock:${p.stock}`));
process.exit(0);
