import { readFileSync } from 'fs';
import { resolve } from 'path';
async function main() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let value = trimmed.slice(eqIdx + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) { process.env[key] = value; }
        }
      }
    }
  } catch(e: any) { console.log('env note:', e.message); }
  const { db } = await import('../lib/db/index');
  const { products } = await import('../lib/db/schema');
  const result = await db.select().from(products);
  console.log(JSON.stringify(result, null, 2));
  console.log('Total:', result.length);
}
main().catch(console.error);
