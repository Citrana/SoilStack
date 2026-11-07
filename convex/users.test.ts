import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  asUser,
  getRoleId,
  insertRole,
  insertUserWithRole,
  setupTest,
  signIn,
  userByEmail,
  type T,
} from "./lib/test.utils";

async function createdUser(t: T, adminId: Id<"users">, email: string, roleKey = "blog_writer") {
  const { password } = await asUser(t, adminId).action(api.users.createUser, {
    name: "New Hire",
    email,
    roleId: await getRoleId(t, roleKey),
  });
  const user = await userByEmail(t, email.trim().toLowerCase());
  return { userId: user!._id, password };
}

test("getCurrentUser: null when signed out or blocked, the user and role otherwise", async () => {
  const t = await setupTest();
  const activeId = await insertUserWithRole(t, "blog_writer", { email: "a@example.com" });
  const blockedId = await insertUserWithRole(t, "blog_writer", { status: "blocked" });

  expect(await t.query(api.users.getCurrentUser, {})).toBeNull();
  expect(await asUser(t, blockedId).query(api.users.getCurrentUser, {})).toBeNull();
  expect(await asUser(t, activeId).query(api.users.getCurrentUser, {})).toMatchObject({
    email: "a@example.com",
    roleKey: "blog_writer",
    roleName: { en: "Blog Writer" },
  });
});

test("createUser returns a one-time password that signs the new user in, forcing a password change", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const { userId, password } = await createdUser(t, adminId, "  New.Hire@Example.com ");
  expect(password).toHaveLength(16);

  const created = await t.run((ctx) => ctx.db.get("users", userId));
  expect(created).toMatchObject({
    email: "new.hire@example.com",
    mustChangePassword: true,
    createdBy: adminId,
    status: "active",
  });
  expect((await signIn(t, "new.hire@example.com", password)).tokens).toBeTruthy();
  expect((await t.run((ctx) => ctx.db.get("users", userId)))!.lastLoginAt).toBeTypeOf("number");

  // Audited without the password.
  const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(logs[0]).toMatchObject({ action: "create", entityTable: "users", actorId: adminId });
  expect(JSON.stringify(logs)).not.toContain(password);
});

test("createUser rejects callers without users.manage, bad input and a taken email", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer");
  const roleId = await getRoleId(t, "blog_writer");

  await expect(
    asUser(t, writerId).action(api.users.createUser, { name: "X", email: "x@example.com", roleId }),
  ).rejects.toThrow(/users\.manage/);
  await expect(
    asUser(t, adminId).action(api.users.createUser, { name: "X", email: "not-an-email", roleId }),
  ).rejects.toThrow(/INVALID_INPUT/);

  await createdUser(t, adminId, "taken@example.com");
  await expect(
    asUser(t, adminId).action(api.users.createUser, { name: "Y", email: "TAKEN@example.com", roleId }),
  ).rejects.toThrow(/EMAIL_TAKEN/);
});

test("createUser requires roles.manage to mint a Super Admin", async () => {
  const t = await setupTest();
  const roleId = await insertRole(t, "user_manager", ["users.manage"]);
  const managerId = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Manager",
      email: "manager@example.com",
      roleId,
      status: "active",
      mustChangePassword: false,
      createdBy: null,
    }),
  );
  await expect(
    asUser(t, managerId).action(api.users.createUser, {
      name: "Boss",
      email: "boss@example.com",
      roleId: await getRoleId(t, "super_admin"),
    }),
  ).rejects.toThrow(/roles\.manage/);
  await expect(
    asUser(t, managerId).action(api.users.createUser, {
      name: "Writer",
      email: "writer@example.com",
      roleId: await getRoleId(t, "blog_writer"),
    }),
  ).resolves.toHaveProperty("password");
});

test("public sign-up is disabled", async () => {
  const t = await setupTest();
  await expect(
    t.action(api.auth.signIn, {
      provider: "password",
      params: { email: "intruder@example.com", password: "whatever-123", flow: "signUp" },
    }),
  ).rejects.toThrow(/sign-up is disabled/);
  expect(await userByEmail(t, "intruder@example.com")).toBeNull();
});

test("setUserStatus blocks and unblocks with audit; a blocked user can't sign in or call functions", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const { userId, password } = await createdUser(t, adminId, "soon-blocked@example.com");

  await asUser(t, adminId).mutation(api.users.setUserStatus, { userId, status: "blocked" });
  await expect(signIn(t, "soon-blocked@example.com", password)).rejects.toThrow();
  await expect(asUser(t, userId).query(api.rbac.getMyPermissions, {})).resolves.toEqual([]);

  await asUser(t, adminId).mutation(api.users.setUserStatus, { userId, status: "active" });
  expect((await signIn(t, "soon-blocked@example.com", password)).tokens).toBeTruthy();

  const logs = await t.run((ctx) =>
    ctx.db
      .query("auditLogs")
      .withIndex("by_entityTable_and_entityId_and_timestamp", (q) =>
        q.eq("entityTable", "users").eq("entityId", userId),
      )
      .collect(),
  );
  expect(logs.map((l) => [l.before?.status, l.after?.status])).toEqual([
    [undefined, "active"],
    ["active", "blocked"],
    ["blocked", "active"],
  ]);
});

test("setUserStatus rejects callers without users.manage and changing your own status", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer");

  await expect(
    asUser(t, writerId).mutation(api.users.setUserStatus, { userId: adminId, status: "blocked" }),
  ).rejects.toThrow(/users\.manage/);
  await expect(
    asUser(t, adminId).mutation(api.users.setUserStatus, { userId: adminId, status: "blocked" }),
  ).rejects.toThrow(/OWN_ACCOUNT/);
});

test("setUserRole changes a role with audit; needs roles.manage; never your own", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer");
  const editorRoleId = await getRoleId(t, "content_editor");

  await asUser(t, adminId).mutation(api.users.setUserRole, { userId: writerId, roleId: editorRoleId });
  expect((await t.run((ctx) => ctx.db.get("users", writerId)))!.roleId).toBe(editorRoleId);
  const log = await t.run((ctx) => ctx.db.query("auditLogs").first());
  expect(log).toMatchObject({
    action: "update",
    before: { role: "blog_writer" },
    after: { role: "content_editor" },
  });

  await expect(
    asUser(t, writerId).mutation(api.users.setUserRole, { userId: adminId, roleId: editorRoleId }),
  ).rejects.toThrow(/roles\.manage/);
  await expect(
    asUser(t, adminId).mutation(api.users.setUserRole, { userId: adminId, roleId: editorRoleId }),
  ).rejects.toThrow(/OWN_ACCOUNT/);
});

test("the last active Super Admin cannot be demoted or blocked", async () => {
  const t = await setupTest();
  const firstId = await insertUserWithRole(t, "super_admin");
  const secondId = await insertUserWithRole(t, "super_admin");
  // A blocked Super Admin doesn't count as a remaining one.
  await insertUserWithRole(t, "super_admin", { status: "blocked" });
  const editorRoleId = await getRoleId(t, "content_editor");

  // Two active Super Admins: one may demote the other.
  await asUser(t, firstId).mutation(api.users.setUserRole, { userId: secondId, roleId: editorRoleId });

  // `first` is now the last active one: nobody can demote or block them.
  const managerRole = await insertRole(t, "role_manager", ["roles.manage", "users.manage"]);
  await t.run((ctx) => ctx.db.patch("users", secondId, { roleId: managerRole }));
  await expect(
    asUser(t, secondId).mutation(api.users.setUserRole, { userId: firstId, roleId: editorRoleId }),
  ).rejects.toThrow(/LAST_SUPER_ADMIN/);
  await expect(
    asUser(t, secondId).mutation(api.users.setUserStatus, { userId: firstId, status: "blocked" }),
  ).rejects.toThrow(/LAST_SUPER_ADMIN/);
});

test("changePassword updates the credential, clears mustChangePassword and enforces the minimum length", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const { userId, password: oldPassword } = await createdUser(t, adminId, "rotate@example.com");

  await expect(
    asUser(t, userId).action(api.users.changePassword, { newPassword: "short" }),
  ).rejects.toThrow(/PASSWORD_TOO_SHORT/);
  await expect(t.action(api.users.changePassword, { newPassword: "long-enough-1" })).rejects.toThrow(
    /NOT_AUTHENTICATED/,
  );

  await asUser(t, userId).action(api.users.changePassword, { newPassword: "correct-horse-battery" });
  expect((await t.run((ctx) => ctx.db.get("users", userId)))!.mustChangePassword).toBe(false);
  await expect(signIn(t, "rotate@example.com", oldPassword)).rejects.toThrow();
  expect((await signIn(t, "rotate@example.com", "correct-horse-battery")).tokens).toBeTruthy();

  const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(JSON.stringify(logs)).not.toContain("correct-horse-battery");
});

test("resetPassword: new one-time password, old one refused, sessions ended, forced change, audited without the password", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const { userId } = await createdUser(t, adminId, "forgot@example.com");

  await asUser(t, userId).action(api.users.changePassword, { newPassword: "my-own-password" });
  expect((await signIn(t, "forgot@example.com", "my-own-password")).tokens).toBeTruthy();
  const sessions = () =>
    t.run((ctx) =>
      ctx.db
        .query("authSessions")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect(),
    );
  expect((await sessions()).length).toBeGreaterThan(0);

  const { password } = await asUser(t, adminId).action(api.users.resetPassword, { userId });
  expect(password).toHaveLength(16);
  expect(await sessions()).toEqual([]);
  await expect(signIn(t, "forgot@example.com", "my-own-password")).rejects.toThrow();
  expect((await signIn(t, "forgot@example.com", password)).tokens).toBeTruthy();
  expect((await t.run((ctx) => ctx.db.get("users", userId)))!.mustChangePassword).toBe(true);

  const entries = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(entries.some((e) => e.actorId === adminId && e.after?.passwordReset === true)).toBe(true);
  expect(JSON.stringify(entries)).not.toContain(password);
});

test("resetPassword is refused without users.manage, on your own account, and on a Super Admin without roles.manage", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const otherAdminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer");
  const { userId } = await createdUser(t, adminId, "victim@example.com");

  await expect(asUser(t, writerId).action(api.users.resetPassword, { userId })).rejects.toThrow(
    /users\.manage/,
  );
  await expect(
    asUser(t, adminId).action(api.users.resetPassword, { userId: adminId }),
  ).rejects.toThrow(/OWN_ACCOUNT/);

  const roleId = await insertRole(t, "user_manager", ["users.manage"]);
  await t.run((ctx) => ctx.db.patch("users", writerId, { roleId }));
  await expect(
    asUser(t, writerId).action(api.users.resetPassword, { userId: otherAdminId }),
  ).rejects.toThrow(/roles\.manage/);
  await expect(asUser(t, writerId).action(api.users.resetPassword, { userId })).resolves.toHaveProperty(
    "password",
  );
});

test("listUsers needs users.manage and returns users with their role", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin", { email: "boss@example.com" });
  const writerId = await insertUserWithRole(t, "blog_writer", { email: "w@example.com" });

  await expect(asUser(t, writerId).query(api.users.listUsers, {})).rejects.toThrow(/users\.manage/);
  const users = await asUser(t, adminId).query(api.users.listUsers, {});
  expect(users.map((u) => [u.email, u.roleKey, u.isSelf])).toEqual([
    ["w@example.com", "blog_writer", false],
    ["boss@example.com", "super_admin", true],
  ]);
  expect(users[0]).not.toHaveProperty("createdBy");
});
