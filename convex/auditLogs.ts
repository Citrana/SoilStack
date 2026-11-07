import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation } from "./_generated/server";
import type { Id, TableNames } from "./_generated/dataModel";
import { authedQuery } from "./lib/rbac";
import { auditActionValidator, logAudit } from "./lib/audit";

/**
 * The audit log is append-only (CLAUDE.md). This module deliberately
 * exports NO public mutation, and no function here or anywhere else may
 * patch, replace or delete an `auditLogs` row - a test enforces this.
 */

/**
 * For actions, which have no ctx.db (e.g. users.createUser). Insert only.
 * Mutations call logAudit / ctx.audit directly instead.
 */
export const insertFromActionInternal = internalMutation({
  args: {
    actorId: v.id("users"),
    action: auditActionValidator,
    entityTable: v.string(),
    entityId: v.string(),
    before: v.optional(v.record(v.string(), v.any())),
    after: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.null(),
  handler: async (ctx, entry) => {
    await logAudit(ctx, {
      ...entry,
      entityTable: entry.entityTable as TableNames,
    });
    return null;
  },
});

/**
 * Audit entries, newest first, optionally filtered by actor or table (and
 * entity id). The most selective filter picks the index.
 */
export const list = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    actorId: v.optional(v.id("users")),
    entityTable: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.requirePermission("audit.view");
    const table = ctx.db.query("auditLogs");
    const { actorId, entityTable, entityId } = args;

    const indexed = actorId
      ? table.withIndex("by_actorId_and_timestamp", (q) => q.eq("actorId", actorId))
      : entityTable && entityId
        ? table.withIndex("by_entityTable_and_entityId_and_timestamp", (q) =>
            q.eq("entityTable", entityTable).eq("entityId", entityId),
          )
        : entityTable
          ? table.withIndex("by_entityTable_and_timestamp", (q) =>
              q.eq("entityTable", entityTable),
            )
          : table.withIndex("by_timestamp");

    // Predicates the chosen index didn't already cover (actor + table).
    const result = await indexed
      .filter((q) =>
        q.and(
          entityTable ? q.eq(q.field("entityTable"), entityTable) : true,
          entityId ? q.eq(q.field("entityId"), entityId) : true,
        ),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const actors = new Map<Id<"users">, { name: string; email: string }>();
    for (const id of new Set(result.page.map((e) => e.actorId))) {
      const user = await ctx.db.get("users", id);
      if (user) actors.set(id, { name: user.name, email: user.email });
    }

    return {
      ...result,
      page: result.page.map((entry) => ({
        ...entry,
        actorName: actors.get(entry.actorId)?.name ?? null,
        actorEmail: actors.get(entry.actorId)?.email ?? null,
      })),
    };
  },
});

/** Everyone who could appear as an actor, for the actor filter. */
export const listActors = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requirePermission("audit.view");
    const users = await ctx.db.query("users").take(500);
    return users
      .map((u) => ({ _id: u._id, name: u.name, email: u.email }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});
