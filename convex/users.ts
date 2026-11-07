import { v } from "convex/values";
import {
  createAccount,
  invalidateSessions,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getCurrentUserOrNull, requireCurrentUserFromAction } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { appError } from "./lib/errors";
import { MIN_PASSWORD_LENGTH, generateStrongPassword } from "./lib/password";
import { SUPER_ADMIN_ROLE_KEY } from "./lib/permissions";
import { authedAction, authedMutation, authedQuery } from "./lib/rbac";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Refuses to take the Super Admin role away from (or block) the last
 * active Super Admin - otherwise nobody could manage users or roles.
 */
async function assertNotLastSuperAdmin(ctx: MutationCtx, target: Doc<"users">) {
  if (target.roleId === null || target.status !== "active") {
    return;
  }
  const role = await ctx.db.get("roles", target.roleId);
  if (role?.key !== SUPER_ADMIN_ROLE_KEY) {
    return;
  }
  const activeSuperAdmins = await ctx.db
    .query("users")
    .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
    .filter((q) => q.eq(q.field("status"), "active"))
    .take(2);
  if (activeSuperAdmins.length <= 1) {
    throw appError("LAST_SUPER_ADMIN", "This is the last active Super Admin.");
  }
}

/** Who's signed in (or null) - the admin's AuthGate reads this. */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const role = user.roleId ? await ctx.db.get("roles", user.roleId) : null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      roleKey: role?.key ?? null,
      roleName: role?.name ?? null,
    };
  },
});

export const getUserByIdInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get("users", userId);
  },
});

export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
  },
});

/** Every user (with their role) for the user management screen. */
export const listUsers = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requirePermission("users.manage");
    const users = await ctx.db.query("users").order("desc").take(500);
    return await Promise.all(
      users.map(async (user) => {
        const role = user.roleId ? await ctx.db.get("roles", user.roleId) : null;
        return {
          _id: user._id,
          _creationTime: user._creationTime,
          name: user.name,
          email: user.email,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
          lastLoginAt: user.lastLoginAt ?? null,
          roleId: user.roleId,
          roleKey: role?.key ?? null,
          roleName: role?.name ?? null,
          isSelf: user._id === ctx.user._id,
        };
      }),
    );
  },
});

/**
 * Creates an admin account with a system-generated password. The password
 * is returned once, in this action's response - Convex Auth stores only a
 * hash, so it can never be retrieved again. The user must choose their own
 * password at first sign-in.
 */
export const createUser = authedAction({
  args: { name: v.string(), email: v.string(), roleId: v.id("roles") },
  handler: async (ctx, args): Promise<{ password: string }> => {
    await ctx.requirePermission("users.manage");
    const name = args.name.trim();
    const email = normalizeEmail(args.email);
    if (!name || !EMAIL_PATTERN.test(email)) {
      throw appError("INVALID_INPUT", "A name and a valid email are required.");
    }
    const role: Doc<"roles"> | null = await ctx.runQuery(
      internal.rbac.getRoleByIdInternal,
      { roleId: args.roleId },
    );
    if (!role) {
      throw appError("NOT_FOUND", "Role not found.");
    }
    // Minting a Super Admin is a privilege grant, not just user management.
    if (role.key === SUPER_ADMIN_ROLE_KEY) {
      await ctx.requirePermission("roles.manage");
    }
    const existing: Doc<"users"> | null = await ctx.runQuery(
      internal.users.getUserByEmailInternal,
      { email },
    );
    if (existing) {
      throw appError("EMAIL_TAKEN", "A user with this email already exists.");
    }
    const password = generateStrongPassword();
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: password },
      profile: {
        name,
        email,
        roleId: role._id,
        status: "active",
        mustChangePassword: true,
        createdBy: ctx.user._id,
      },
    });
    // Actions can't write the DB directly. Never log the password.
    await ctx.runMutation(internal.auditLogs.insertFromActionInternal, {
      actorId: ctx.user._id,
      action: "create",
      entityTable: "users",
      entityId: user._id,
      after: {
        name,
        email,
        roleId: role._id,
        role: role.key,
        status: "active",
        mustChangePassword: true,
      },
    });
    return { password };
  },
});

export const setUserStatus = authedMutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("blocked")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, status }) => {
    await ctx.requirePermission("users.manage");
    if (userId === ctx.user._id) {
      throw appError("OWN_ACCOUNT", "You cannot change your own status.");
    }
    const target = await ctx.db.get("users", userId);
    if (!target) {
      throw appError("NOT_FOUND", "User not found.");
    }
    if (target.status === status) {
      return null;
    }
    if (status === "blocked") {
      await assertNotLastSuperAdmin(ctx, target);
    }
    await ctx.db.patch("users", userId, { status });
    await ctx.audit({
      action: "update",
      entityTable: "users",
      entityId: userId,
      before: { email: target.email, status: target.status },
      after: { email: target.email, status },
    });
    return null;
  },
});

/**
 * Assigns a user's role. Gated by roles.manage (not just users.manage)
 * because it grants privileges. Takes effect on the user's next call.
 */
export const setUserRole = authedMutation({
  args: { userId: v.id("users"), roleId: v.id("roles") },
  returns: v.null(),
  handler: async (ctx, { userId, roleId }) => {
    await ctx.requirePermission("roles.manage");
    if (userId === ctx.user._id) {
      throw appError("OWN_ACCOUNT", "You cannot change your own role.");
    }
    const target = await ctx.db.get("users", userId);
    if (!target) {
      throw appError("NOT_FOUND", "User not found.");
    }
    const role = await ctx.db.get("roles", roleId);
    if (!role) {
      throw appError("NOT_FOUND", "Role not found.");
    }
    if (target.roleId === roleId) {
      return null;
    }
    await assertNotLastSuperAdmin(ctx, target);
    const previousRole = target.roleId
      ? await ctx.db.get("roles", target.roleId)
      : null;
    await ctx.db.patch("users", userId, { roleId });
    await ctx.audit({
      action: "update",
      entityTable: "users",
      entityId: userId,
      before: { email: target.email, roleId: target.roleId, role: previousRole?.key ?? null },
      after: { email: target.email, roleId, role: role.key },
    });
    return null;
  },
});

/**
 * Runs after a successful password change: clears the forced-change flag
 * and audits the change (the user is their own actor). The password is
 * never logged - only the fact that it changed.
 */
export const clearMustChangePassword = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    await ctx.db.patch("users", userId, { mustChangePassword: false });
    await logAudit(ctx, {
      actorId: userId,
      action: "update",
      entityTable: "users",
      entityId: userId,
      before: { email: user.email, mustChangePassword: user.mustChangePassword },
      after: { email: user.email, mustChangePassword: false, passwordChanged: true },
    });
    return null;
  },
});

/**
 * The signed-in user changes their own password, clearing the forced
 * password-change flag. An action because modifyAccountCredentials needs
 * action context.
 */
export const changePassword = action({
  args: { newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, { newPassword }) => {
    const user = await requireCurrentUserFromAction(ctx);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw appError(
        "PASSWORD_TOO_SHORT",
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: user.email, secret: newPassword },
    });
    await ctx.runMutation(internal.users.clearMustChangePassword, {
      userId: user._id,
    });
    return null;
  },
});

/**
 * Records a password reset done by an admin: forces a new password at the
 * user's next sign-in and audits it (actor = the admin). Never the password.
 */
export const markPasswordReset = internalMutation({
  args: { userId: v.id("users"), actorId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId, actorId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    await ctx.db.patch("users", userId, { mustChangePassword: true });
    await logAudit(ctx, {
      actorId,
      action: "update",
      entityTable: "users",
      entityId: userId,
      before: { email: user.email, mustChangePassword: user.mustChangePassword },
      after: { email: user.email, mustChangePassword: true, passwordReset: true },
    });
    return null;
  },
});

/**
 * Resets a user who forgot their password: a new strong password replaces
 * the old one, every session of that user is signed out, and they must
 * choose their own password at the next sign-in. The new password is
 * returned once (to share in person or by phone). Not for your own account
 * (use changePassword); resetting a Super Admin also needs roles.manage.
 */
export const resetPassword = authedAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<{ password: string }> => {
    await ctx.requirePermission("users.manage");
    if (userId === ctx.user._id) {
      throw appError("OWN_ACCOUNT", "Use Change password for your own account.");
    }
    const target: Doc<"users"> | null = await ctx.runQuery(
      internal.users.getUserByIdInternal,
      { userId },
    );
    if (!target) {
      throw appError("NOT_FOUND", "User not found.");
    }
    if (target.roleId) {
      const role: Doc<"roles"> | null = await ctx.runQuery(
        internal.rbac.getRoleByIdInternal,
        { roleId: target.roleId },
      );
      // Taking over a Super Admin's account is a privilege matter.
      if (role?.key === SUPER_ADMIN_ROLE_KEY) {
        await ctx.requirePermission("roles.manage");
      }
    }
    const password = generateStrongPassword();
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: target.email, secret: password },
    });
    // The old password and every open session stop working now.
    await invalidateSessions(ctx, { userId: target._id });
    await ctx.runMutation(internal.users.markPasswordReset, {
      userId: target._id,
      actorId: ctx.user._id,
    });
    return { password };
  },
});
