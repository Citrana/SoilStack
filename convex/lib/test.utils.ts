// Test-only helpers shared by convex/*.test.ts. The two dots in the file
// name are deliberate: the Convex CLI skips files with more than one dot,
// so this never gets pushed to a deployment.
import { convexTest, type TestConvex } from "convex-test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import type { PermissionKey } from "./permissions";

export type T = TestConvex<typeof schema>;

export const modules = import.meta.glob("../**/*.*s");

/** A fresh backend with reference data seeded, like after a deploy. */
export async function setupTest(): Promise<T> {
  const t = convexTest(schema, modules);
  await t.mutation(internal.rbac.seedRbac, {});
  return t;
}

export async function getRoleId(t: T, key: string): Promise<Id<"roles">> {
  const role = await t.run((ctx) =>
    ctx.db
      .query("roles")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique(),
  );
  if (!role) {
    throw new Error(`Role "${key}" not seeded - call setupTest first.`);
  }
  return role._id;
}

/** A role holding exactly `permissions` (created directly, no audit). */
export async function insertRole(
  t: T,
  key: string,
  permissions: PermissionKey[],
): Promise<Id<"roles">> {
  return await t.run(async (ctx) => {
    const roleId = await ctx.db.insert("roles", {
      key,
      name: { fr: key, en: key },
      description: { fr: "", en: "" },
      isSystem: false,
    });
    for (const permissionKey of permissions) {
      const permission = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", permissionKey))
        .unique();
      await ctx.db.insert("rolePermissions", {
        roleId,
        permissionId: permission!._id,
      });
    }
    return roleId;
  });
}

let emailCounter = 0;

/** Inserts a user holding the given role (by key), or no role. */
export async function insertUserWithRole(
  t: T,
  roleKey: string | null,
  overrides: Partial<{
    name: string;
    email: string;
    status: "active" | "blocked";
    mustChangePassword: boolean;
  }> = {},
): Promise<Id<"users">> {
  const roleId = roleKey === null ? null : await getRoleId(t, roleKey);
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user${++emailCounter}@example.com`,
      roleId,
      status: overrides.status ?? "active",
      mustChangePassword: overrides.mustChangePassword ?? false,
      createdBy: null,
    }),
  );
}

export function asUser(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

export async function userByEmail(t: T, email: string) {
  return await t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique(),
  );
}

export function signIn(t: T, email: string, password: string) {
  return t.action(api.auth.signIn, {
    provider: "password",
    params: { email, password, flow: "signIn" },
  });
}
