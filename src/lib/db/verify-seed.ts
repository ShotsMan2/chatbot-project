import { db } from "./index";
import { products, coupons, faqs } from "./schema";

async function verify() {
  const p = await db.select().from(products);
  const c = await db.select().from(coupons);
  const f = await db.select().from(faqs);
  console.log("--- PRODUCTS (" + p.length + ") ---");
  p.forEach(x => console.log(x.id + ". " + x.name + " | " + x.price + " TL | " + x.category));
  console.log("--- COUPONS (" + c.length + ") ---");
  c.forEach(x => console.log(x.code + " | %" + x.discountPercent));
  console.log("--- FAQS (" + f.length + ") ---");
  f.forEach(x => console.log(x.question));
  process.exit(0);
}

verify().catch(console.error);
