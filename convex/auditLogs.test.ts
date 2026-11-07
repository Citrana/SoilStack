import { expect, test } from "vitest";
import { api } from "./_generated/api";
import * as auditLogsModule from "./auditLogs";
import { appendOnlyGuardedDb } from "./lib/rbac";
import {
  asUser,
  getRoleId,
  insertUserWithRole,
  setupTest,
} from "./lib/test.utils";

const PAGE = { numItems: 50, cursor: null };

async function setup() {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin", { name: "Admin", email: "admin@x.com" });
  return { t, adminId, asAdmin: asUser(t, adminId) };
}

test("admin actions show up in the log, newest first, with the actor's name", async () => {
  const { t, adminId, asAdmin } = await setup();
  await asAdmin.action(api.users.createUser, {
    name: "Writer",
    email: "writer@x.com",
    roleId: await getRoleId(t, "blog_writer"),
  });
  await asAdmin.mutation(api.rbac.setRolePermission, {
    roleId: await getRoleId(t, "blog_writer"),
    permissionKey: "blog.publish",
    granted: true,
  });

  const { page } = await asAdmin.query(api.auditLogs.list, { paginationOpts: PAGE });
  expect(page.map((e) => [e.action, e.entityTable])).toEqual([
    ["create", "rolePermissions"],
    ["create", "users"],
  ]);
  expect(page.every((e) => e.actorId === adminId && e.actorName === "Admin")).toBe(true);
});

test("list filters by actor and by table", async () => {
  const { t, asAdmin } = await setup();
  const writerRole = await getRoleId(t, "blog_writer");
  await asAdmin.action(api.users.createUser, { name: "W", email: "w@x.com", roleId: writerRole });
  await asAdmin.mutation(api.rbac.setRolePermission, {
    roleId: writerRole,
    permissionKey: "blog.publish",
    granted: true,
  });
  const writer = await t.run((ctx) =>
    ctx.db.query("users").withIndex("email", (q) => q.eq("email", "w@x.com")).unique(),
  );
  await asUser(t, writer!._id).action(api.users.changePassword, { newPassword: "a-new-password" });

  const byTable = await asAdmin.query(api.auditLogs.list, { paginationOpts: PAGE, entityTable: "users" });
  expect(byTable.page).toHaveLength(2);
  const byActor = await asAdmin.query(api.auditLogs.list, { paginationOpts: PAGE, actorId: writer!._id });
  expect(byActor.page.map((e) => e.after?.passwordChanged)).toEqual([true]);
  const byActorAndTable = await asAdmin.query(api.auditLogs.list, {
    paginationOpts: PAGE,
    actorId: writer!._id,
    entityTable: "rolePermissions",
  });
  expect(byActorAndTable.page).toEqual([]);
});

test("reading the log requires audit.view", async () => {
  const { t } = await setup();
  const editorId = await insertUserWithRole(t, "content_editor");
  await expect(
    asUser(t, editorId).query(api.auditLogs.list, { paginationOpts: PAGE }),
  ).rejects.toThrow(/audit\.view/);
  await expect(asUser(t, editorId).query(api.auditLogs.listActors, {})).rejects.toThrow(/audit\.view/);
});

test("the auditLogs module exposes no public mutation or action", () => {
  for (const [name, fn] of Object.entries(auditLogsModule)) {
    const registered = fn as { isQuery?: boolean; isInternal?: boolean };
    if (!registered.isQuery) {
      expect(registered.isInternal, `${name} must be internal`).toBe(true);
    }
  }
});

test("the guarded ctx.db of authedMutation refuses to modify audit rows", async () => {
  const { t, adminId } = await setup();
  const entry = { actorId: adminId, action: "create" as const, entityTable: "users", entityId: "u1", timestamp: 1 };
  const entryId = await t.run((ctx) => ctx.db.insert("auditLogs", entry));

  await expect(
    t.run((ctx) => appendOnlyGuardedDb(ctx).patch("auditLogs", entryId, { entityId: "tamper" })),
  ).rejects.toThrow();
  await expect(t.run((ctx) => appendOnlyGuardedDb(ctx).delete("auditLogs", entryId))).rejects.toThrow();
  // Inserting is still allowed.
  await t.run((ctx) => appendOnlyGuardedDb(ctx).insert("auditLogs", { ...entry, entityId: "u2" }));
  const rows = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(rows.map((r) => r.entityId)).toEqual(["u1", "u2"]);
});

test("no Convex source file patches, replaces or deletes audit rows", () => {
  const sources = import.meta.glob("./**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  });
  const offenders = Object.entries(sources)
    .filter(([path]) => !path.includes("_generated") && !path.endsWith(".test.ts"))
    .filter(([, source]) => /\.(patch|replace|delete)\(\s*["'`]auditLogs["'`]/.test(source))
    .map(([path]) => path);
  expect(Object.keys(sources).length).toBeGreaterThan(5);
  expect(offenders).toEqual([]);
});
