const fs = require('fs');
const path = 'src/app/demo/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The original 8 products
const originalProducts = `{[
              { emoji: "👟", name: "Spor Ayakkabı - Siyah/Beyaz", price: "899", old: "1.299", rating: "4.8 (2.3K)" },
              { emoji: "👜", name: "Deri El Çantası - Premium", price: "1.249", old: "1.899", rating: "4.7 (856)" },
              { emoji: "⌚", name: "Akıllı Saat - GPS Destekli", price: "2.499", old: "3.299", rating: "4.9 (5.1K)" },
              { emoji: "🎧", name: "Kablosuz Kulaklık - ANC", price: "1.599", old: "2.199", rating: "4.6 (1.2K)" },
              { emoji: "📱", name: "Telefon Kılıfı - Şeffaf", price: "149", old: "249", rating: "4.5 (3.4K)" },
              { emoji: "🧥", name: "Kışlık Mont - Su Geçirmez", price: "1.899", old: "2.799", rating: "4.8 (945)" },
              { emoji: "👓", name: "Güneş Gözlüğü - UV400", price: "449", old: "699", rating: "4.4 (678)" },
              { emoji: "🎒", name: "Laptop Sırt Çantası", price: "699", old: "999", rating: "4.7 (2.1K)" },
            ].map((product, i) => (`;

const regexGrid = /\{\[\s*\{\s*emoji:\s*["']👟["'],\s*name:\s*["']Spor Ayakkabı 1["'][\s\S]*?\]\.map\(\(product, i\) => \(/;
content = content.replace(regexGrid, originalProducts);

const regexContext = /(Kablolu Klavye Mekanik\*\* - 299 TL\n)[\s\S]*?(\n\*\*Kampanyalar)/;
content = content.replace(regexContext, '$1$2');

fs.writeFileSync(path, content, 'utf8');
console.log('Lines:', content.split('\\n').length);
