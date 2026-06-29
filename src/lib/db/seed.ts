import { db } from "./index";
import { products } from "./schema";

async function seed() {
  console.log("Starting seed...");
  const emojis = ['👟', '👜', '⌚', '🎧', '📱', '🧥', '👓', '🎒'];
  const names = ['Spor Ayakkabı', 'Deri Çanta', 'Akıllı Saat', 'Kulaklık', 'Telefon Kılıfı', 'Kışlık Mont', 'Gözlük', 'Sırt Çantası'];
  
  const batchSize = 1000;
  for (let i = 0; i < 10000; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize; j++) {
      const idx = i + j;
      const emoji = emojis[idx % emojis.length];
      const name = names[idx % names.length] + ' ' + (idx + 1);
      const price = ((idx % 1000) + 100).toString();
      const oldPrice = ((idx % 1000) + 200).toString();
      const rating = '4.' + (idx % 9) + ' (' + idx + 'K)';
      
      batch.push({
        name,
        price,
        oldPrice,
        rating,
        emoji,
      });
    }
    await db.insert(products).values(batch);
    console.log(`Inserted ${i + batchSize} products`);
  }
  console.log("Done seeding!");
}

seed().catch(console.error);
