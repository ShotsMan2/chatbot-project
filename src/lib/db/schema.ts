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
  id: text("id").primaryKey(),
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
  id: text("id").primaryKey(),
  userId: text("user_id"),
  cartId: text("cart_id").references(() => carts.id),
  totalAmount: text("total_amount").notNull(),
  status: text("status", { enum: ["preparing", "shipped", "delivered", "cancelled"] }).notNull().default("preparing"),
  trackingCode: text("tracking_code"),
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("Misafir Kullanıcı"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  preferredLanguage: text("preferred_language").notNull().default("tr"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  conversationId: text("conversation_id"),
  issue: text("issue").notNull(),
  status: text("status", { enum: ["open", "in_progress", "resolved"] }).notNull().default("open"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const returns = pgTable("returns", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  orderId: text("order_id").notNull().references(() => orders.id),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "refunded"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const b2bQuotes = pgTable("b2b_quotes", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  requestedQuantity: integer("requested_quantity").notNull(),
  targetPrice: text("target_price"),
  status: text("status", { enum: ["pending", "review", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  frequency: text("frequency", { enum: ["weekly", "biweekly", "monthly", "quarterly"] }).notNull().default("monthly"),
  status: text("status", { enum: ["active", "paused", "cancelled"] }).notNull().default("active"),
  nextDeliveryDate: timestamp("next_delivery_date").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wishlists = pgTable("wishlists", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull().default("My Wishlist"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  wishlistId: text("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const flashSales = pgTable("flash_sales", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  discountPercent: integer("discount_percent").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isActive: integer("is_active").notNull().default(1),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  eventType: text("event_type", { enum: ["view_product", "add_to_cart", "remove_from_cart", "checkout", "search"] }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const negotiations = pgTable("negotiations", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  originalPrice: text("original_price").notNull(),
  proposedPrice: text("proposed_price").notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const giftRegistries = pgTable("gift_registries", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  eventName: text("event_name").notNull(),
  eventDate: timestamp("event_date"),
  targetAmount: text("target_amount"),
  currentAmount: text("current_amount").default("0"),
  status: text("status", { enum: ["active", "completed"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const giftContributions = pgTable("gift_contributions", {
  id: serial("id").primaryKey(),
  registryId: text("registry_id").notNull().references(() => giftRegistries.id, { onDelete: "cascade" }),
  contributorName: text("contributor_name").notNull(),
  amount: text("amount").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const productArAssets = pgTable("product_ar_assets", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  modelUrl: text("model_url").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const web3Wallets = pgTable("web3_wallets", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  walletAddress: text("wallet_address").notNull().unique(),
  network: text("network").notNull().default("ethereum"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const nftAssets = pgTable("nft_assets", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  contractAddress: text("contract_address").notNull(),
  tokenId: text("token_id").notNull(),
  metadataUrl: text("metadata_url"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sentimentLogs = pgTable("sentiment_logs", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  sentiment: text("sentiment", { enum: ["positive", "negative", "neutral", "frustrated", "excited"] }).notNull(),
  score: integer("score"), // e.g. -100 to 100
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const dynamicPricingRules = pgTable("dynamic_pricing_rules", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  basePrice: text("base_price").notNull(),
  minPrice: text("min_price").notNull(),
  maxPrice: text("max_price").notNull(),
  currentDemandMultiplier: text("current_demand_multiplier").notNull().default("1.0"),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
