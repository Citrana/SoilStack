import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { PERMISSION_KEYS } from "./lib/permissions";
import {
  asUser,
  getRoleId,
  insertRole,
  insertUserWithRole,
  setupTest,
} from "./lib/test.utils";

test("seedRbac seeds the catalog, a locked Super Admin and the starter roles, idempotently", async () => {
  const t = await setupTest();
  await t.mutation(internal.rbac.seedRbac, {});

  const { permissions, roles, steps } = await t.run(async (ctx) => ({
    permissions: await ctx.db.query("permissions").collect(),
    roles: await ctx.db.query("roles").collect(),
    steps: await ctx.db.query("appliedSeedSteps").collect(),
  }));
  expect(permissions.map((p) => p.key).sort()).toEqual([...PERMISSION_KEYS].sort());
  expect(roles.map((r) => r.key).sort()).toEqual(
    ["blog_writer", "content_editor", "product_manager", "super_admin"],
  );
  expect(roles.find((r) => r.key === "super_admin")?.isSystem).toBe(true);
  expect(roles.filter((r) => r.isSystem)).toHaveLength(1);
  expect(steps).toHaveLength(2);
});

test("the Super Admin holds every permission; a starter role only its defaults; anonymous nothing", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer");

  expect((await asUser(t, adminId).query(api.rbac.getMyPermissions, {})).sort()).toEqual(
    [...PERMISSION_KEYS].sort(),
  );
  expect((await asUser(t, writerId).query(api.rbac.getMyPermissions, {})).sort()).toEqual(
    ["blog.write", "media.upload"],
  );
  expect(await t.query(api.rbac.getMyPermissions, {})).toEqual([]);
});

test("a deleted or edited starter role stays that way after re-seeding", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const asAdmin = asUser(t, adminId);

  await asAdmin.mutation(api.rbac.deleteRole, { roleId: await getRoleId(t, "product_manager") });
  const writerRoleId = await getRoleId(t, "blog_writer");
  await asAdmin.mutation(api.rbac.setRolePermission, {
    roleId: writerRoleId,
    permissionKey: "media.upload",
    granted: false,
  });

  await t.mutation(internal.rbac.seedRbac, {});

  const roles = await t.run((ctx) => ctx.db.query("roles").collect());
  expect(roles.map((r) => r.key)).not.toContain("product_manager");
  const role = await asAdmin.query(api.rbac.getRole, { roleId: writerRoleId });
  const granted = role!.modules.flatMap((m) => m.permissions).filter((p) => p.granted);
  expect(granted.map((p) => p.key)).toEqual(["blog.write"]);
});

test("a permission granted to a role takes effect immediately, and revoking removes it", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const roleId = await insertRole(t, "viewer", []);
  const viewerId = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Viewer",
      email: "viewer@example.com",
      roleId,
      status: "active",
      mustChangePassword: false,
      createdBy: null,
    }),
  );
  const asViewer = asUser(t, viewerId);

  await expect(asViewer.query(api.auditLogs.listActors, {})).rejects.toThrow(/FORBIDDEN/);

  await asUser(t, adminId).mutation(api.rbac.setRolePermission, {
    roleId,
    permissionKey: "audit.view",
    granted: true,
  });
  await expect(asViewer.query(api.auditLogs.listActors, {})).resolves.toBeDefined();

  await asUser(t, adminId).mutation(api.rbac.setRolePermission, {
    roleId,
    permissionKey: "audit.view",
    granted: false,
  });
  await expect(asViewer.query(api.auditLogs.listActors, {})).rejects.toThrow(/FORBIDDEN/);

  const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(logs.map((l) => [l.action, l.entityTable])).toEqual([
    ["create", "rolePermissions"],
    ["delete", "rolePermissions"],
  ]);
});

test("createRole and updateRole need roles.manage, a name in both languages, and are audited", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const editorId = await insertUserWithRole(t, "content_editor");
  const name = { fr: "Photographe", en: "Photographer" };
  const description = { fr: "Images", en: "Images" };

  await expect(
    asUser(t, editorId).mutation(api.rbac.createRole, { name, description }),
  ).rejects.toThrow(/roles\.manage/);
  await expect(
    asUser(t, adminId).mutation(api.rbac.createRole, {
      name: { fr: "Photographe", en: " " },
      description,
    }),
  ).rejects.toThrow(/INVALID_INPUT/);

  const roleId = await asUser(t, adminId).mutation(api.rbac.createRole, { name, description });
  const sameName = await asUser(t, adminId).mutation(api.rbac.createRole, { name, description });
  const keys = await t.run(async (ctx) => [
    (await ctx.db.get("roles", roleId))!.key,
    (await ctx.db.get("roles", sameName))!.key,
  ]);
  expect(keys).toEqual(["photographer", "photographer_2"]);

  await asUser(t, adminId).mutation(api.rbac.updateRole, {
    roleId,
    name: { fr: "Photographe", en: "Photographer (media)" },
    description,
  });
  const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(logs.map((l) => [l.action, l.entityTable])).toEqual([
    ["create", "roles"],
    ["create", "roles"],
    ["update", "roles"],
  ]);
  expect(logs[2].after).toMatchObject({ name: { en: "Photographer (media)" } });
});

test("the Super Admin role is locked: no edit, no permission change, no delete", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const asAdmin = asUser(t, adminId);
  const roleId = await getRoleId(t, "super_admin");

  await expect(
    asAdmin.mutation(api.rbac.setRolePermission, {
      roleId,
      permissionKey: "audit.view",
      granted: false,
    }),
  ).rejects.toThrow(/ROLE_LOCKED/);
  await expect(
    asAdmin.mutation(api.rbac.updateRole, {
      roleId,
      name: { fr: "X", en: "X" },
      description: { fr: "", en: "" },
    }),
  ).rejects.toThrow(/ROLE_LOCKED/);
  await expect(asAdmin.mutation(api.rbac.deleteRole, { roleId })).rejects.toThrow(/ROLE_LOCKED/);
});

test("deleteRole refuses a role still held by a user, and removes an unused one with its links", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  await insertUserWithRole(t, "blog_writer");
  const asAdmin = asUser(t, adminId);

  await expect(
    asAdmin.mutation(api.rbac.deleteRole, { roleId: await getRoleId(t, "blog_writer") }),
  ).rejects.toThrow(/ROLE_IN_USE/);

  const roleId = await getRoleId(t, "content_editor");
  await asAdmin.mutation(api.rbac.deleteRole, { roleId });
  const links = await t.run((ctx) =>
    ctx.db
      .query("rolePermissions")
      .withIndex("by_roleId_and_permissionId", (q) => q.eq("roleId", roleId))
      .collect(),
  );
  expect(links).toEqual([]);
  const log = await t.run((ctx) => ctx.db.query("auditLogs").first());
  expect(log).toMatchObject({ action: "delete", entityTable: "roles" });
  expect(log!.before?.permissions).toEqual(
    expect.arrayContaining(["pages.edit", "pages.publish", "media.upload"]),
  );
});

test("setRolePermission rejects unknown keys and callers without roles.manage", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const editorId = await insertUserWithRole(t, "content_editor");
  const roleId = await getRoleId(t, "blog_writer");

  await expect(
    asUser(t, adminId).mutation(api.rbac.setRolePermission, {
      roleId,
      permissionKey: "nope.nope",
      granted: true,
    }),
  ).rejects.toThrow(/INVALID_INPUT/);
  await expect(
    asUser(t, editorId).mutation(api.rbac.setRolePermission, {
      roleId,
      permissionKey: "users.manage",
      granted: true,
    }),
  ).rejects.toThrow(/roles\.manage/);
});

test("getRole returns null for a malformed or unknown id; listRoles counts permissions and users", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  await insertUserWithRole(t, "blog_writer");
  const asAdmin = asUser(t, adminId);

  expect(await asAdmin.query(api.rbac.getRole, { roleId: "not-an-id" })).toBeNull();

  const roles = await asAdmin.query(api.rbac.listRoles, {});
  const byKey = Object.fromEntries(roles.map((r) => [r.key, r]));
  expect(byKey.super_admin).toMatchObject({
    locked: true,
    permissionCount: PERMISSION_KEYS.length,
    userCount: 1,
  });
  expect(byKey.blog_writer).toMatchObject({ locked: false, permissionCount: 2, userCount: 1 });
});

test("unauthenticated and blocked callers are rejected by authed functions", async () => {
  const t = await setupTest();
  const blockedId = await insertUserWithRole(t, "super_admin", { status: "blocked" });

  await expect(t.query(api.rbac.listRoles, {})).rejects.toThrow(/NOT_AUTHENTICATED/);
  await expect(asUser(t, blockedId).query(api.rbac.listRoles, {})).rejects.toThrow(
    /NOT_AUTHENTICATED/,
  );
});
