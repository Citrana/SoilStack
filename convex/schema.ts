import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { auditActionValidator } from "./lib/audit";
import { locValidator } from "./lib/i18n";
import { locRichValidator } from "./lib/richText";
import { pageKeyValidator } from "./lib/pages";
import { sectionValidator, seoValidator } from "./lib/sections";
import { settingsFields } from "./lib/settings";

/**
 * Single source of truth for every table. Tables are added feature by
 * feature (auth + RBAC, media, pages, blog, products, projects).
 */
export default defineSchema({
  ...authTables,

  // Admin accounts only - the public site has no accounts. Created by an
  // admin (users.createUser) or the seed; never through public sign-up.
  users: defineTable({
    name: v.string(),
    email: v.string(),
    // User -> Role -> Permissions. null means "no role", i.e. no access.
    roleId: v.union(v.id("roles"), v.null()),
    status: v.union(v.literal("active"), v.literal("blocked")),
    mustChangePassword: v.boolean(),
    createdBy: v.union(v.id("users"), v.null()),
    // UTC ms of the last successful sign-in.
    lastLoginAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("by_roleId", ["roleId"]),

  roles: defineTable({
    // Stable slug (e.g. "super_admin"), used by the seed.
    key: v.string(),
    name: locValidator,
    description: locValidator,
    // Locked system role (Super Admin): can't be edited or deleted.
    isSystem: v.boolean(),
  }).index("by_key", ["key"]),

  permissions: defineTable({
    key: v.string(),
    module: v.string(),
    description: v.string(),
  }).index("by_key", ["key"]),

  rolePermissions: defineTable({
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  })
    .index("by_roleId_and_permissionId", ["roleId", "permissionId"])
    .index("by_permissionId", ["permissionId"]),

  // Keys of one-shot seed steps already applied (SEED_STEPS in
  // convex/lib/permissions.ts). Only ever inserted.
  appliedSeedSteps: defineTable({
    key: v.string(),
  }).index("by_key", ["key"]),

  // Image library (convex/lib/media.ts). Files live in Convex storage,
  // resized to WebP in the browser before upload.
  media: defineTable({
    storageId: v.id("_storage"),
    filename: v.string(),
    alt: locValidator,
    mimeType: v.string(),
    // Bytes, as stored.
    size: v.number(),
    width: v.number(),
    height: v.number(),
    // ~16px WebP data URL shown while the real image loads.
    blurDataUrl: v.string(),
    uploadedBy: v.id("users"),
  }),

  // Which records use which image (setMediaUsages). An image with a usage
  // can't be deleted.
  mediaUsages: defineTable({
    mediaId: v.id("media"),
    ownerTable: v.string(),
    ownerId: v.string(),
    // Where in the owner, e.g. "cover", "gallery", "body".
    field: v.string(),
  })
    .index("by_mediaId", ["mediaId"])
    .index("by_ownerTable_and_ownerId", ["ownerTable", "ownerId"]),

  // The six company pages (convex/lib/pages.ts), seeded once, never
  // deleted. Edits go to `draft`; publishing copies it to `published`.
  pages: defineTable({
    key: pageKeyValidator,
    draft: v.object({ seo: seoValidator, sections: v.array(sectionValidator) }),
    published: v.union(
      v.object({ seo: seoValidator, sections: v.array(sectionValidator) }),
      v.null(),
    ),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
    updatedBy: v.union(v.id("users"), v.null()),
  }).index("by_key", ["key"]),

  // Blog posts (convex/posts.ts). One slug for both languages.
  posts: defineTable({
    slug: v.string(),
    title: locValidator,
    excerpt: locValidator,
    // Sanitized TipTap JSON per language (convex/lib/richText.ts).
    body: locRichValidator,
    coverImageId: v.optional(v.id("media")),
    tags: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
    readingMinutes: v.object({ fr: v.number(), en: v.number() }),
    authorId: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_publishedAt", ["status", "publishedAt"])
    .index("by_authorId", ["authorId"]),

  // Product catalogue (convex/products.ts, convex/productCategories.ts).
  productCategories: defineTable({
    slug: v.string(),
    name: locValidator,
    description: locValidator,
    order: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"]),

  products: defineTable({
    slug: v.string(),
    name: locValidator,
    shortDescription: locValidator,
    description: locRichValidator,
    // USD cents; missing = "Price on request" (convex/lib/money.ts).
    priceCents: v.optional(v.number()),
    unit: v.optional(locValidator),
    categoryId: v.id("productCategories"),
    // The first is the main photo.
    imageIds: v.array(v.id("media")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    featured: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_categoryId", ["categoryId"])
    .index("by_status_and_featured", ["status", "featured"]),

  // Single row: contact details, social links, footer (all public).
  siteSettings: defineTable(settingsFields),

  // Append-only (CLAUDE.md, "Audit logging"). Written only by logAudit.
  auditLogs: defineTable({
    actorId: v.id("users"),
    action: auditActionValidator,
    entityTable: v.string(),
    entityId: v.string(),
    // JSON snapshots: the full record for create/delete, only the changed
    // fields for update. Never secrets.
    before: v.optional(v.record(v.string(), v.any())),
    after: v.optional(v.record(v.string(), v.any())),
    // UTC ms.
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_actorId_and_timestamp", ["actorId", "timestamp"])
    .index("by_entityTable_and_timestamp", ["entityTable", "timestamp"])
    .index("by_entityTable_and_entityId_and_timestamp", [
      "entityTable",
      "entityId",
      "timestamp",
    ]),
});
