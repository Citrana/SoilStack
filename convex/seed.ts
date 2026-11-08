import { createAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { generateStrongPassword } from "./lib/password";

export const findSuperAdminInternal = internalQuery({
  args: { superAdminRoleId: v.id("roles") },
  handler: async (ctx, { superAdminRoleId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_roleId", (q) => q.eq("roleId", superAdminRoleId))
      .first();
  },
});

/**
 * Seeds all reference data (permissions, Super Admin role, starter roles)
 * and the starter content (six pages, site settings) - created only when
 * missing, so edits survive.
 * Idempotent - run it after every deploy that changes them:
 *   npx convex run seed:seedReferenceData
 */
export const seedReferenceData = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(internal.rbac.seedRbac, {});
    await ctx.runMutation(internal.pages.seedContent, {});
    await ctx.runMutation(internal.productCategories.seedCategories, {});
    return null;
  },
});

/**
 * Bootstraps the first Super Admin, once:
 *   npx convex env set SUPER_ADMIN_NAME "Jane Doe"
 *   npx convex env set SUPER_ADMIN_EMAIL jane@example.com
 *   npx convex run seed:seedSuperAdmin
 * Internal, so only someone with deployment access can run it. The password
 * is generated, printed once in the command's output, and must be changed
 * at first sign-in - no password is ever stored in env. Does nothing if a
 * Super Admin already exists.
 */
export const seedSuperAdmin = internalAction({
  args: {},
  returns: v.union(
    v.object({ created: v.literal(true), email: v.string(), password: v.string() }),
    v.object({ created: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx) => {
    const { superAdminRoleId }: { superAdminRoleId: Id<"roles"> } =
      await ctx.runMutation(internal.rbac.seedRbac, {});
    const existing: Doc<"users"> | null = await ctx.runQuery(
      internal.seed.findSuperAdminInternal,
      { superAdminRoleId },
    );
    if (existing) {
      return { created: false as const, message: "A Super Admin already exists." };
    }

    const name = process.env.SUPER_ADMIN_NAME?.trim();
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    if (!name || !email) {
      throw new Error(
        "Missing SUPER_ADMIN_NAME or SUPER_ADMIN_EMAIL. " +
          "Set them with `npx convex env set <NAME> <VALUE>` first.",
      );
    }

    const password = generateStrongPassword();
    await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: password },
      profile: {
        name,
        email,
        roleId: superAdminRoleId,
        status: "active",
        mustChangePassword: true,
        createdBy: null,
      },
    });
    return { created: true as const, email, password };
  },
});
