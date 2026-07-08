import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ilike, or, and, gte, lte, SQL, sql } from "drizzle-orm";

export async function searchProducts(params: { 
  query?: string, 
  category?: string, 
  brand?: string,
  minPrice?: number,
  maxPrice?: number
}) {
  try {
    const startTime = Date.now();
    let { query, category, brand, minPrice, maxPrice } = params;

    const conditions: SQL[] = [];

    // Fallback dictionary for synonyms
    const synonyms: Record<string, string> = {
      "watch": "Akıllı Saat",
      "saat": "Akıllı Saat",
      "kılıf": "Telefon Kılıfı",
      "case": "Telefon Kılıfı",
      "kabı": "Telefon Kılıfı",
      "kulaklık": "Kulaklık",
      "headphone": "Kulaklık",
      "laptop": "Laptop",
      "pc": "Laptop",
      "bilgisayar": "Laptop",
      "macbook": "Laptop"
    };

    if (query) {
      const qLower = query.toLowerCase();
      // Synonym check
      for (const [key, val] of Object.entries(synonyms)) {
        if (qLower.includes(key)) {
          category = category || val;
        }
      }
    }

    const sanitizeForIlike = (text: string): string => {
      if (!text) return text;
      return text
        .replace(/[ıiİI]/g, '_')
        .replace(/[şsŞS]/g, '_')
        .replace(/[ğgĞG]/g, '_')
        .replace(/[çcÇC]/g, '_')
        .replace(/[öoÖO]/g, '_')
        .replace(/[üuÜU]/g, '_');
    };

    if (category) category = sanitizeForIlike(category);
    if (brand) brand = sanitizeForIlike(brand);
    if (query) query = sanitizeForIlike(query);

    // Only search active products
    conditions.push(sql`${products.status} = 'active'`);

    if (category) {
      conditions.push(ilike(products.category, `%${category}%`));
    }
    
    if (brand) {
      conditions.push(ilike(products.brand, `%${brand}%`));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(products.priceValue, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(products.priceValue, maxPrice.toString()));
    }

    if (query && !category && !brand) {
      // If we only have a general query
      const searchTerm = `%${query.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.description, searchTerm),
          ilike(products.category, searchTerm),
          ilike(products.brand, searchTerm)
        )!
      );
    } else if (query) {
      // If we have category/brand AND a query, we might want to also match name/desc
       const searchTerm = `%${query.trim()}%`;
       conditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.description, searchTerm)
        )!
      );
    }

    let results = [];
    if (conditions.length > 0) {
       // Using AND for combined conditions
       results = await db.select().from(products).where(and(...conditions)).limit(10);
    } else {
       results = await db.select().from(products).limit(10);
    }

    // Fallback Search Mechanism - Fuzzy/Trigram Simulation
    if (results.length === 0 && query) {
      console.log("[searchProducts] No results found, attempting fuzzy fallback search for query:", query);
      const words = query.split(" ").filter(w => w.length > 2);
      if (words.length > 0) {
        const fallbackConditions = words.map(w => 
          or(
            ilike(products.name, `%${w}%`),
            ilike(products.description, `%${w}%`),
            ilike(products.category, `%${w}%`),
            ilike(products.brand, `%${w}%`)
          )!
        );
        // Retain price & status filters in fallback
        const baseConditions = [sql`${products.status} = 'active'`];
        if (minPrice !== undefined) baseConditions.push(gte(products.priceValue, minPrice.toString()));
        if (maxPrice !== undefined) baseConditions.push(lte(products.priceValue, maxPrice.toString()));
        
        results = await db.select().from(products).where(and(...baseConditions, or(...fallbackConditions))).limit(10);
      }
    }

    const latency = Date.now() - startTime;
    console.log(`[searchProducts] Returned ${results.length} rows. Latency: ${latency}ms`);

    return results;
  } catch (error) {
    console.error("[searchProducts] Error querying products:", error);
    return [];
  }
}
