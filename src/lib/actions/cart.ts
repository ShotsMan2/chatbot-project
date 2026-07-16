"use server";

import { db } from "@/lib/db";
import { carts, cartItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function addToCartAction(productId: number, quantity: number = 1, convId: string) {
  try {
    let cart = await db.select().from(carts).where(eq(carts.id, convId)).limit(1).then(res => res[0]);
    if (!cart) {
      await db.insert(carts).values({ id: convId });
    }
    
    await db.insert(cartItems).values({
      cartId: convId,
      productId: productId,
      quantity: quantity
    });
    
    return { success: true };
  } catch (error) {
    console.error("Add to cart error:", error);
    return { success: false, error: "Sepete eklenirken bir hata oluştu." };
  }
}
