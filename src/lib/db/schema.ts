import { 
  pgTable, 
  text, 
  integer, 
  real, 
  timestamp, 
  boolean, 
  uuid, 
  jsonb, 
  index, 
  primaryKey,
  serial,
  decimal,
  vector
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// === Core Tables (Backward Compatible + Enhanced) ===

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  roleId: uuid("role_id"), // Reference to roles table
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // e.g., 'admin', 'user'
  permissions: jsonb("permissions"), // JSON array of permissions
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentId: uuid("parent_id"), // Self-referencing for nested folders
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(), // Keeping text for backward compatibility
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  model: text("model").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  summary: text("summary"), // Auto-generated summary
  metadata: jsonb("metadata"), // Additional conversation context
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdx: index("idx_conversations_user_id").on(table.userId),
    folderIdx: index("idx_conversations_folder_id").on(table.folderId),
    // Partial index for active conversations
    activeIdx: index("idx_conversations_active").on(table.id).where(sql`${table.isArchived} = false`),
  };
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["system", "user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  status: text("status", { enum: ["pending", "streaming", "completed", "cancelled", "failed"] }).notNull(),
  version: integer("version").notNull().default(1), // For message editing/regenerating versions
  metadata: jsonb("metadata"), // RAG sources, UI states, context scores
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalDuration: integer("total_duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Composite index to resolve N+1 and slow queries when fetching conversation messages
    conversationCreatedAtIdx: index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
  };
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
});

export const conversationTags = pgTable("conversation_tags", {
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.conversationId, table.tagId] }),
  };
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for global settings
  defaultModel: text("default_model").notNull().default("qwen3.5:4b"),
  defaultSystemPrompt: text("default_system_prompt").notNull().default("You are a helpful AI assistant."),
  temperature: real("temperature").notNull().default(0.7),
  contextSize: integer("context_size").notNull().default(4096),
  lastCleanupAt: timestamp("last_cleanup_at"),
  lastCleanupCount: integer("last_cleanup_count"),
});

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  parentId: uuid("parent_id"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(), // using serial instead of autoIncrement
  name: text("name").notNull(),
  brand: text("brand"), // Legacy
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  category: text("category"), // Legacy
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  description: text("description"),
  price: text("price").notNull(), // Legacy
  priceValue: decimal("price_value", { precision: 10, scale: 2 }),
  oldPrice: text("old_price"), // Legacy
  oldPriceValue: decimal("old_price_value", { precision: 10, scale: 2 }),
  rating: text("rating"),
  emoji: text("emoji"),
  sizes: text("sizes"), // e.g., "S, M, L" or "Standart"
  variants: jsonb("variants"), // e.g., {"colors": ["Black", "White"]}
  technicalSpecs: jsonb("technical_specs"),
  seoTags: text("seo_tags").array(),
  status: text("status", { enum: ["active", "inactive", "draft"] }).notNull().default("active"),
  stock: integer("stock").notNull().default(0),
  campaign: text("campaign"), // e.g., "Yılbaşı İndirimi"
  embedding: vector("embedding", { dimensions: 1536 }), // Semantic Search with pgvector
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete
}, (table) => {
  return {
    nameIdx: index("idx_products_name").on(table.name),
    categoryIdx: index("idx_products_category").on(table.category),
    brandIdx: index("idx_products_brand").on(table.brand),
    brandIdIdx: index("idx_products_brand_id").on(table.brandId),
    categoryIdIdx: index("idx_products_category_id").on(table.categoryId),
    statusIdx: index("idx_products_status").on(table.status),
    embeddingIdx: index("idx_products_embedding").using("hnsw", table.embedding.op("vector_cosine_ops")),
  };
});

// === AI Memory System ===

export const memories = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["short_term", "long_term", "semantic", "episodic"] }).notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  contextScore: real("context_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdx: index("idx_memories_user_id").on(table.userId),
  };
});

// === RAG & Retrieval System ===

export const namespaces = pgTable("namespaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // e.g., "Company Policies", "Product Specs"
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  namespaceId: uuid("namespace_id").notNull().references(() => namespaces.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: jsonb("metadata"), // Source info, page number, etc.
  chunkIndex: integer("chunk_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// === Security & Analytics ===

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g., "DELETE_CONVERSATION", "LOGIN"
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usageAnalytics = pgTable("usage_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  cost: real("cost").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});
