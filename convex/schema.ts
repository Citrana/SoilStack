import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { auditActionValidator } from "./lib/audit";
import { locValidator } from "./lib/i18n";

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
