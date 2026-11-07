import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUserOrNull } from "./lib/auth";
import { diff, snapshot } from "./lib/audit";
import { appError } from "./lib/errors";
import { locValidator, trimLoc, type Loc } from "./lib/i18n";
import {
  authedMutation,
  authedQuery,
  loadIsSuperAdmin,
  loadPermissions,
} from "./lib/rbac";
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  SEED_STEPS,
  SUPER_ADMIN_ROLE,
  SUPER_ADMIN_ROLE_KEY,
  isPermissionKey,
} from "./lib/permissions";

async function findLink(
  ctx: QueryCtx,
  roleId: Id<"roles">,
  permissionId: Id<"permissions">,
) {
  return await ctx.db
    .query("rolePermissions")
    .withIndex("by_roleId_and_permissionId", (q) =>
      q.eq("roleId", roleId).eq("permissionId", permissionId),
    )
    .unique();
}

async function ensureLink(
  ctx: MutationCtx,
  roleId: Id<"roles">,
  permissionId: Id<"permissions">,
) {
  if (!(await findLink(ctx, roleId, permissionId))) {
    await ctx.db.insert("rolePermissions", { roleId, permissionId });
  }
}

async function findRoleByKey(ctx: QueryCtx, key: string) {
  return await ctx.db
    .query("roles")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

async function grantedKeys(ctx: QueryCtx, roleId: Id<"roles">) {
  const links = await ctx.db
    .query("rolePermissions")
    .withIndex("by_roleId_and_permissionId", (q) => q.eq("roleId", roleId))
    .take(500);
  const docs = await Promise.all(
    links.map((link) => ctx.db.get("permissions", link.permissionId)),
  );
  return new Set(docs.flatMap((d) => (d ? [d.key] : [])));
}

/**
 * Idempotently seeds the permission catalog, the locked Super Admin role and
 * the one-shot SEED_STEPS (starter roles, later grants). Safe to re-run:
 *   npx convex run seed:seedReferenceData
 * - Permissions are upserted by key.
 * - Super Admin is created if missing and always re-synced to every key.
 * - Each SEED_STEP runs once (recorded in `appliedSeedSteps`), so roles an
 *   admin edited or deleted afterwards stay that way.
 * System bootstrap with no acting user, so it writes no audit entries.
 */
export const seedRbac = internalMutation({
  args: {},
  returns: v.object({ superAdminRoleId: v.id("roles") }),
  handler: async (ctx) => {
    const permissionIds = new Map<string, Id<"permissions">>();
    for (const p of PERMISSIONS) {
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", p.key))
        .unique();
      if (existing) {
        if (
          existing.description !== p.description ||
          existing.module !== p.module
        ) {
          await ctx.db.patch("permissions", existing._id, {
            description: p.description,
            module: p.module,
          });
        }
        permissionIds.set(p.key, existing._id);
      } else {
        permissionIds.set(p.key, await ctx.db.insert("permissions", { ...p }));
      }
    }

    const existingSuperAdmin = await findRoleByKey(ctx, SUPER_ADMIN_ROLE_KEY);
    const superAdminRoleId =
      existingSuperAdmin?._id ??
      (await ctx.db.insert("roles", { ...SUPER_ADMIN_ROLE, isSystem: true }));
    for (const key of PERMISSION_KEYS) {
      await ensureLink(ctx, superAdminRoleId, permissionIds.get(key)!);
    }

    for (const step of SEED_STEPS) {
      const applied = await ctx.db
        .query("appliedSeedSteps")
        .withIndex("by_key", (q) => q.eq("key", step.key))
        .unique();
      if (applied) continue;

      for (const seed of step.createRoles ?? []) {
        if (await findRoleByKey(ctx, seed.key)) continue;
        const roleId = await ctx.db.insert("roles", {
          key: seed.key,
          name: seed.name,
          description: seed.description,
          isSystem: false,
        });
        for (const key of seed.permissions) {
          await ensureLink(ctx, roleId, permissionIds.get(key)!);
        }
      }
      for (const [roleKey, permissionKey] of step.grants ?? []) {
        const role = await findRoleByKey(ctx, roleKey);
        if (role) await ensureLink(ctx, role._id, permissionIds.get(permissionKey)!);
      }
      for (const [roleKey, permissionKey] of step.revokes ?? []) {
        const role = await findRoleByKey(ctx, roleKey);
        const link = role
          ? await findLink(ctx, role._id, permissionIds.get(permissionKey)!)
          : null;
        if (link) await ctx.db.delete("rolePermissions", link._id);
      }
      await ctx.db.insert("appliedSeedSteps", { key: step.key });
    }

    return { superAdminRoleId };
  },
});

/** Used by authedAction, which has no ctx.db. */
export const getPermissionsForUserInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    permissions: v.array(v.string()),
    isSuperAdmin: v.boolean(),
  }),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return { permissions: [], isSuperAdmin: false };
    }
    return {
      permissions: [...(await loadPermissions(ctx, user))],
      isSuperAdmin: await loadIsSuperAdmin(ctx, user),
    };
  },
});

export const getRoleByIdInternal = internalQuery({
  args: { roleId: v.id("roles") },
  handler: async (ctx, { roleId }) => {
    return await ctx.db.get("roles", roleId);
  },
});

/**
 * The caller's permission keys, for the admin's useCan(). Empty when
 * signed out - it never throws, so the UI can call it unconditionally. UI
 * hiding only; the server stays the authority via requirePermission.
 */
export const getMyPermissions = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    return [...(await loadPermissions(ctx, user))];
  },
});

async function userCount(ctx: QueryCtx, roleId: Id<"roles">) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_roleId", (q) => q.eq("roleId", roleId))
    .take(1000);
  return users.length;
}

/** Every role with how many permissions and users it has. */
export const listRoles = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requirePermission("roles.manage");
    const roles = await ctx.db.query("roles").take(200);
    return await Promise.all(
      roles.map(async (role) => ({
        ...role,
        locked: role.isSystem,
        permissionCount:
          role.key === SUPER_ADMIN_ROLE_KEY
            ? PERMISSION_KEYS.length
            : (await grantedKeys(ctx, role._id)).size,
        userCount: await userCount(ctx, role._id),
      })),
    );
  },
});

/** Role picker options for creating users / assigning roles. */
export const listRoleOptions = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requirePermission("users.manage");
    const roles = await ctx.db.query("roles").take(200);
    return roles.map((r) => ({ _id: r._id, key: r.key, name: r.name }));
  },
});

/**
 * A role plus every catalog permission, grouped by module, with whether the
 * role holds it. Takes the id as a plain string (it comes from the URL) and
 * returns null for a malformed or unknown id instead of failing validation.
 */
export const getRole = authedQuery({
  args: { roleId: v.string() },
  handler: async (ctx, args) => {
    await ctx.requirePermission("roles.manage");
    const roleId = ctx.db.normalizeId("roles", args.roleId);
    const role = roleId ? await ctx.db.get("roles", roleId) : null;
    if (!roleId || !role) {
      return null;
    }
    const locked = role.key === SUPER_ADMIN_ROLE_KEY;
    const granted = await grantedKeys(ctx, roleId);
    const modules: Array<{
      module: string;
      permissions: Array<{ key: string; granted: boolean }>;
    }> = [];
    for (const p of PERMISSIONS) {
      let group = modules.find((m) => m.module === p.module);
      if (!group) {
        group = { module: p.module, permissions: [] };
        modules.push(group);
      }
      group.permissions.push({ key: p.key, granted: locked || granted.has(p.key) });
    }
    return {
      role,
      locked,
      userCount: await userCount(ctx, roleId),
      modules,
    };
  },
});

function assertRoleText(name: Loc) {
  if (!name.fr || !name.en) {
    throw appError("INVALID_INPUT", "A role needs a name in French and English.");
  }
}

function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "role"
  );
}

async function assertEditable(ctx: QueryCtx, roleId: Id<"roles">) {
  const role = await ctx.db.get("roles", roleId);
  if (!role) {
    throw appError("NOT_FOUND", "Role not found.");
  }
  if (role.isSystem) {
    throw appError("ROLE_LOCKED", "The Super Admin role is locked.");
  }
  return role;
}

const roleSnapshot = (role: Pick<Doc<"roles">, "key" | "name" | "description">) =>
  snapshot(role, ["key", "name", "description"]);

/** Creates an empty role; permissions are then ticked on its page. */
export const createRole = authedMutation({
  args: { name: locValidator, description: locValidator },
  returns: v.id("roles"),
  handler: async (ctx, args) => {
    await ctx.requirePermission("roles.manage");
    const name = trimLoc(args.name);
    const description = trimLoc(args.description);
    assertRoleText(name);
    const base = slugify(name.en);
    let key = base;
    for (let n = 2; await findRoleByKey(ctx, key); n++) {
      key = `${base}_${n}`;
    }
    const role = { key, name, description, isSystem: false };
    const roleId = await ctx.db.insert("roles", role);
    await ctx.audit({
      action: "create",
      entityTable: "roles",
      entityId: roleId,
      after: roleSnapshot(role),
    });
    return roleId;
  },
});

export const updateRole = authedMutation({
  args: { roleId: v.id("roles"), name: locValidator, description: locValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.requirePermission("roles.manage");
    const role = await assertEditable(ctx, args.roleId);
    const name = trimLoc(args.name);
    const description = trimLoc(args.description);
    assertRoleText(name);
    const changes = diff(
      { name: role.name, description: role.description },
      { name, description },
    );
    if (!changes) return null;
    await ctx.db.patch("roles", role._id, { name, description });
    await ctx.audit({
      action: "update",
      entityTable: "roles",
      entityId: role._id,
      before: { role: role.key, ...changes.before },
      after: { role: role.key, ...changes.after },
    });
    return null;
  },
});

/**
 * Grants or revokes one permission. Applies immediately: permissions are
 * resolved fresh on every call. Always audited.
 */
export const setRolePermission = authedMutation({
  args: {
    roleId: v.id("roles"),
    permissionKey: v.string(),
    granted: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { roleId, permissionKey, granted }) => {
    await ctx.requirePermission("roles.manage");
    if (!isPermissionKey(permissionKey)) {
      throw appError("INVALID_INPUT", "Unknown permission.");
    }
    const role = await assertEditable(ctx, roleId);
    const permission = await ctx.db
      .query("permissions")
      .withIndex("by_key", (q) => q.eq("key", permissionKey))
      .unique();
    if (!permission) {
      throw appError("NOT_FOUND", "Permission not seeded. Run seed:seedReferenceData.");
    }
    const link = await findLink(ctx, roleId, permission._id);
    // Readable keys alongside ids, so the audit page makes sense on its own.
    const describe = { roleId, role: role.key, permission: permissionKey };

    if (!granted && link) {
      await ctx.db.delete("rolePermissions", link._id);
      await ctx.audit({
        action: "delete",
        entityTable: "rolePermissions",
        entityId: link._id,
        before: describe,
      });
    } else if (granted && !link) {
      const linkId = await ctx.db.insert("rolePermissions", {
        roleId,
        permissionId: permission._id,
      });
      await ctx.audit({
        action: "create",
        entityTable: "rolePermissions",
        entityId: linkId,
        after: describe,
      });
    }
    return null;
  },
});

/** Deletes a role nobody holds any more, with its permission links. */
export const deleteRole = authedMutation({
  args: { roleId: v.id("roles") },
  returns: v.null(),
  handler: async (ctx, { roleId }) => {
    await ctx.requirePermission("roles.manage");
    const role = await assertEditable(ctx, roleId);
    if ((await userCount(ctx, roleId)) > 0) {
      throw appError("ROLE_IN_USE", "Move this role's users to another role first.");
    }
    const permissions = [...(await grantedKeys(ctx, roleId))];
    const links = await ctx.db
      .query("rolePermissions")
      .withIndex("by_roleId_and_permissionId", (q) => q.eq("roleId", roleId))
      .take(500);
    for (const link of links) {
      await ctx.db.delete("rolePermissions", link._id);
    }
    await ctx.db.delete("roles", roleId);
    await ctx.audit({
      action: "delete",
      entityTable: "roles",
      entityId: roleId,
      before: { ...roleSnapshot(role), permissions },
    });
    return null;
  },
});
