import { pgTable, text, integer, real, timestamp, serial, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  model: text("model").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["system", "user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  status: text("status", { enum: ["pending", "streaming", "completed", "cancelled", "failed"] }).notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalDuration: integer("total_duration"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  defaultModel: text("default_model").notNull().default("qwen3.5:4b"),
  defaultSystemPrompt: text("default_system_prompt").notNull().default("You are a helpful AI assistant."),
  temperature: real("temperature").notNull().default(0.7),
  contextSize: integer("context_size").notNull().default(4096),
  lastCleanupAt: timestamp("last_cleanup_at"),
  lastCleanupCount: integer("last_cleanup_count"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(),
  stock: integer("stock").notNull().default(10),
  imageUrl: text("image_url"),
  category: text("category").notNull().default("general"),
});

export const carts = pgTable("carts", {
  id: text("id").primaryKey(), // Session-based cart ID
  userId: text("user_id"), 
  status: text("status", { enum: ["active", "checkout", "abandoned"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(),
  isActive: integer("is_active").notNull().default(1),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("general"),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // uuid order ID
  userId: text("user_id"),
  cartId: text("cart_id").references(() => carts.id),
  totalAmount: text("total_amount").notNull(),
  status: text("status", { enum: ["preparing", "shipped", "delivered", "cancelled"] }).notNull().default("preparing"),
  trackingCode: text("tracking_code"),
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
