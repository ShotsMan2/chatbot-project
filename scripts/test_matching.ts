import { db } from "../src/lib/db";
import { products } from "../src/lib/db/schema";
import { matchesProductKeyword, normalizeProductKeyword } from "../src/lib/product-search";

async function main() {
  const message = "kışlık mont ne kadar";
  const STOP_WORDS = new Set(["acaba","hangi","modelleriniz","modeller","neler","var","mi","mı","ne","bir","senin","sizin","bana","ben","isteyorum","istiyorum","ariyorum","arıyorum","göster","goster","ver","bak","bakiyorum","bakarim","soruyorum","sor","lütfen","lutfen","yardim","yardım","nasıl","nasil","kadar","kac","kaç","fiyat","nerede","bu","su","şu","ve","ile","o","ama","de","da","benim","sen","siz","onlar","biz","ya","veya","ki","daha","en","çok","az","hem","hiç","hic","icin","için","üzere","uzere","sonra","önce","once"]);

  const normalizeRaw = (s: string) =>
    s.toLowerCase().replace(/[ç]/g,'c').replace(/[ğ]/g,'g').replace(/[ı]/g,'i').replace(/[ö]/g,'o').replace(/[ş]/g,'s').replace(/[ü]/g,'u')
     .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

  const rawTokens = normalizeRaw(message).split(' ').filter((t: string) => t.length > 1 && !STOP_WORDS.has(t));
  const serverKeyword = rawTokens.join(' ');
  console.log("normalizeRaw:", "'" + normalizeRaw(message) + "'");
  console.log("rawTokens:", JSON.stringify(rawTokens));
  console.log("serverKeyword:", "'" + serverKeyword + "'");

  const llmKw = normalizeProductKeyword("kışlık mont ne kadar");
  console.log("normalizeProductKeyword of raw message:", "'" + llmKw + "'");

  const searchResults = await db.select().from(products).limit(50);
  console.log("\nDB products found:", searchResults.length);
  searchResults.forEach(p => {
    const nk = normalizeProductKeyword(p.name);
    const nkt = nk.split(' ');
    const srvTokens = serverKeyword.split(' ');
    const tokenMatch = srvTokens.some((t: string) => nkt.includes(t));
    const fullMatch = matchesProductKeyword(serverKeyword, p.name);
    console.log(`  "${p.name}" -> norm: "${nk}" -> tokenMatch: ${tokenMatch} fullMatch: ${fullMatch}`);
  });

  const bestKeyword = serverKeyword;
  const matchedProducts = searchResults.filter((product) =>
    matchesProductKeyword(bestKeyword, product.name) ||
    matchesProductKeyword(bestKeyword, product.description || "") ||
    matchesProductKeyword(bestKeyword, product.category)
  );
  console.log("\nmatchedProducts:", matchedProducts.length);
  matchedProducts.forEach(p => console.log("  MATCHED:", p.name, p.price, "TL"));
}

main().then(() => process.exit(0)).catch(e => { console.error("ERROR:", e.message); process.exit(1); });
