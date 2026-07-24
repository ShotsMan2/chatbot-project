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
  defaultModel: text("default_model").notNull().default("qwen2.5:7b"),
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

export const spatialSessions = pgTable("spatial_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  environment: text("environment", { enum: ["luxury_boutique", "cyber_mall", "beach_store"] }).notNull().default("luxury_boutique"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agenticTasks = pgTable("agentic_tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  agentType: text("agent_type", { enum: ["devin", "copilot", "pi", "cursor", "opencode"] }).notNull(),
  taskDescription: text("task_description").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "failed"] }).notNull().default("pending"),
  resultPayload: text("result_payload"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const groupBuys = pgTable("group_buys", {
  id: text("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  initiatorUserId: text("initiator_user_id").notNull(),
  requiredParticipants: integer("required_participants").notNull().default(5),
  currentParticipants: integer("current_participants").notNull().default(1),
  discountPercent: integer("discount_percent").notNull().default(20),
  status: text("status", { enum: ["active", "completed", "expired"] }).notNull().default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const groupBuyParticipants = pgTable("group_buy_participants", {
  id: serial("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuys.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userQuests = pgTable("user_quests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  questType: text("quest_type", { enum: ["daily_login", "review_product", "invite_friend", "find_easter_egg"] }).notNull(),
  status: text("status", { enum: ["active", "completed", "claimed"] }).notNull().default("active"),
  rewardPoints: integer("reward_points").notNull().default(50),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userWardrobes = pgTable("user_wardrobes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  purchaseDate: timestamp("purchase_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  wearFrequency: integer("wear_frequency").notNull().default(0),
});

export const exclusiveDrops = pgTable("exclusive_drops", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  dropName: text("drop_name").notNull(),
  requiredLoyaltyPoints: integer("required_loyalty_points").notNull().default(500),
  isUnlocked: integer("is_unlocked").notNull().default(0),
  availableUntil: timestamp("available_until"),
});

export const customManufacturingRequests = pgTable("custom_manufacturing_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  productType: text("product_type").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status", { enum: ["designing", "manufacturing", "shipped", "delivered"] }).notNull().default("designing"),
  price: text("price"),
  estimatedDelivery: timestamp("estimated_delivery"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const aiGeneratedDesigns = pgTable("ai_generated_designs", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => customManufacturingRequests.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  designData: text("design_data"),
  isApproved: integer("is_approved").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const hyperlocalNodes = pgTable("hyperlocal_nodes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  droneFleetSize: integer("drone_fleet_size").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
});

export const neuralCommerceSessions = pgTable("neural_commerce_sessions", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  typingSpeedWpm: integer("typing_speed_wpm"),
  hesitationCount: integer("hesitation_count").notNull().default(0),
  detectedEmotion: text("detected_emotion", { enum: ["eager", "hesitant", "frustrated", "bored", "urgent"] }),
  appliedStrategy: text("applied_strategy"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const brandEvents = pgTable("brand_events", {
  id: serial("id").primaryKey(),
  eventName: text("event_name").notNull(),
  eventDate: timestamp("event_date").notNull(),
  location: text("location").notNull(),
  requiredLoyaltyPoints: integer("required_loyalty_points").notNull().default(1000),
  isVirtual: integer("is_virtual").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const bespokeMeasurements = pgTable("bespoke_measurements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  shoulderWidth: real("shoulder_width"),
  chest: real("chest"),
  waist: real("waist"),
  inseam: real("inseam"),
  fitPreference: text("fit_preference", { enum: ["slim", "regular", "oversize", "tailored"] }).notNull().default("tailored"),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tryAtHomeRequests = pgTable("try_at_home_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status", { enum: ["pending", "shipped", "delivered", "returned", "completed"] }).notNull().default("pending"),
  curatedBoxDescription: text("curated_box_description"),
  trackingCode: text("tracking_code"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const vipConciergeSessions = pgTable("vip_concierge_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  agentType: text("agent_type", { enum: ["human_stylist", "devin_luxury", "copilot_bespoke"] }).notNull(),
  sessionNotes: text("session_notes"),
  status: text("status", { enum: ["active", "concluded"] }).notNull().default("active"),
  startedAt: timestamp("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const brandAmbassadorApplications = pgTable("brand_ambassador_applications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  socialMediaHandle: text("social_media_handle").notNull(),
  portfolioUrl: text("portfolio_url"),
  status: text("status", { enum: ["under_review", "approved", "rejected"] }).notNull().default("under_review"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const brandHeritageArchives = pgTable("brand_heritage_archives", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  era: text("era").notNull(),
  storyContent: text("story_content").notNull(),
  artifactImageUrl: text("artifact_image_url"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const clientStyleDna = pgTable("client_style_dna", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  colorPalette: text("color_palette").default("neutral"),
  preferredMaterials: text("preferred_materials"),
  lifestyleProfile: text("lifestyle_profile"),
  climateZone: text("climate_zone"),
  skinTone: text("skin_tone"),
  lastUpdated: timestamp("last_updated").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const theVaultProducts = pgTable("the_vault_products", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  requiredLoyaltyPoints: integer("required_loyalty_points").notNull().default(5000),
  isArchived: integer("is_archived").notNull().default(0),
  unlockPasscode: text("unlock_passcode"),
});

export const digitalCertificates = pgTable("digital_certificates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().references(() => orders.id),
  issueDate: timestamp("issue_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  authenticityHash: text("authenticity_hash").notNull().unique(),
  isTransferred: integer("is_transferred").notNull().default(0),
});

export const whiteGloveServices = pgTable("white_glove_services", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  serviceType: text("service_type", { enum: ["airport_delivery", "home_tailoring", "private_courier", "style_consultation"] }).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  locationDetails: text("location_details").notNull(),
  status: text("status", { enum: ["requested", "confirmed", "in_progress", "completed"] }).notNull().default("requested"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const oneOfOneRequests = pgTable("one_of_one_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  designBrief: text("design_brief").notNull(),
  inspirationUrls: text("inspiration_urls"),
  status: text("status", { enum: ["brief_submitted", "design_phase", "client_review", "manufacturing", "delivered"] }).notNull().default("brief_submitted"),
  estimatedPrice: text("estimated_price"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
