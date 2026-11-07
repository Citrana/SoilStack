import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import {
  wrapDatabaseWriter,
  type Rules,
} from "convex-helpers/server/rowLevelSecurity";
import { action, mutation, query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { DataModel, Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { requireCurrentUser, requireCurrentUserFromAction } from "./auth";
import { logAudit, type AuditEntry } from "./audit";
import { appError } from "./errors";
import {
  PERMISSION_KEYS,
  SUPER_ADMIN_ROLE_KEY,
  isPermissionKey,
  type PermissionKey,
} from "./permissions";

export type PermissionSet = ReadonlySet<PermissionKey>;

/**
 * Whether the user holds the locked Super Admin role.
 */
export async function loadIsSuperAdmin(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
): Promise<boolean> {
  if (user.roleId === null) return false;
  const role = await ctx.db.get("roles", user.roleId);
  return role?.key === SUPER_ADMIN_ROLE_KEY;
}

/**
 * Resolves User -> Role -> Permissions. Always read fresh from the database
 * (never cached), so a role change takes effect on the very next call - and
 * queries using it re-run reactively when the role's permissions change.
 * The Super Admin always holds every catalog key, even one added since the
 * last seed.
 */
export async function loadPermissions(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
): Promise<PermissionSet> {
  if (user.roleId === null) {
    return new Set();
  }
  if (await loadIsSuperAdmin(ctx, user)) {
    return new Set(PERMISSION_KEYS);
  }
  const links = await ctx.db
    .query("rolePermissions")
    .withIndex("by_roleId_and_permissionId", (q) =>
      q.eq("roleId", user.roleId!),
    )
    .take(500);
  const docs = await Promise.all(
    links.map((link) => ctx.db.get("permissions", link.permissionId)),
  );
  const permissions = new Set<PermissionKey>();
  for (const doc of docs) {
    if (doc && isPermissionKey(doc.key)) {
      permissions.add(doc.key);
    }
  }
  return permissions;
}

function assertPermission(permissions: PermissionSet, key: PermissionKey) {
  if (!permissions.has(key)) {
    throw appError("FORBIDDEN", `Forbidden: missing permission "${key}".`);
  }
}

/**
 * Standalone check for code that isn't built on the authed* wrappers.
 * Prefer `ctx.requirePermission` inside authedQuery/authedMutation.
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  key: PermissionKey,
): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  assertPermission(await loadPermissions(ctx, user), key);
  return user;
}

function buildPermissionCtx(
  user: Doc<"users">,
  permissions: PermissionSet,
  isSuperAdmin: boolean,
) {
  return {
    user,
    permissions,
    isSuperAdmin,
    can: (key: PermissionKey) => permissions.has(key),
    requirePermission: async (key: PermissionKey) =>
      assertPermission(permissions, key),
  };
}

/** What authedQuery / authedMutation / authedAction add to ctx. */
export type PermissionCtx = ReturnType<typeof buildPermissionCtx>;

/** ctx inside an authedQuery - for helper functions that take it. */
export type AuthedQueryCtx = QueryCtx & PermissionCtx;

/** ctx inside an authedMutation - for helper functions that take it. */
export type AuthedMutationCtx = MutationCtx &
  PermissionCtx & { audit: (entry: AuditEntry) => Promise<void> };

async function permissionCtxFor(ctx: QueryCtx | MutationCtx) {
  const user = await requireCurrentUser(ctx);
  return buildPermissionCtx(
    user,
    await loadPermissions(ctx, user),
    await loadIsSuperAdmin(ctx, user),
  );
}

/**
 * Every admin query/mutation/action goes through these (CLAUDE.md,
 * "Permissions & security"). They reject unauthenticated or blocked callers
 * and add `ctx.user`, `ctx.permissions`, `ctx.can(key)` and
 * `ctx.requirePermission(key)`. Handlers must still call
 * `ctx.requirePermission` for the specific permission they need.
 */
export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => await permissionCtxFor(ctx)),
);

/**
 * Append-only tables: rows may be inserted but never patched, replaced or
 * deleted. Enforced at runtime on authedMutation's `ctx.db`.
 */
const APPEND_ONLY_RULES: Rules<MutationCtx, DataModel> = {
  auditLogs: { modify: async () => false },
  appliedSeedSteps: { modify: async () => false },
};

/** `ctx.db` that throws on patch/replace/delete of append-only tables. */
export function appendOnlyGuardedDb(ctx: MutationCtx) {
  return wrapDatabaseWriter(ctx, ctx.db, APPEND_ONLY_RULES);
}

/**
 * Also adds `ctx.audit(entry)` - logAudit with the caller as actor - and
 * swaps `ctx.db` for one that refuses to modify append-only tables.
 */
export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const permissionCtx = await permissionCtxFor(ctx);
    const db = appendOnlyGuardedDb(ctx);
    return {
      ...permissionCtx,
      db,
      audit: (entry: AuditEntry) =>
        logAudit({ ...ctx, db }, { ...entry, actorId: permissionCtx.user._id }),
    };
  }),
);

/** Actions have no ctx.db, so permissions come through an internal query. */
export const authedAction = customAction(
  action,
  // Explicit return type: this ctx comes from an internal query, whose type
  // would otherwise depend on this very wrapper.
  customCtx(async (ctx): Promise<PermissionCtx> => {
    const user = await requireCurrentUserFromAction(ctx);
    const {
      permissions: keys,
      isSuperAdmin,
    }: { permissions: string[]; isSuperAdmin: boolean } = await ctx.runQuery(
      internal.rbac.getPermissionsForUserInternal,
      { userId: user._id },
    );
    return buildPermissionCtx(
      user,
      new Set(keys.filter(isPermissionKey)),
      isSuperAdmin,
    );
  }),
);
