import { afterEach, expect, test } from "vitest";
import { internal } from "./_generated/api";
import { setupTest, signIn, userByEmail } from "./lib/test.utils";

afterEach(() => {
  delete process.env.SUPER_ADMIN_NAME;
  delete process.env.SUPER_ADMIN_EMAIL;
});

test("seedSuperAdmin needs the env vars", async () => {
  const t = await setupTest();
  await expect(t.action(internal.seed.seedSuperAdmin, {})).rejects.toThrow(/SUPER_ADMIN_NAME/);
});

test("seedSuperAdmin creates exactly one Super Admin with a one-time password, then does nothing", async () => {
  const t = await setupTest();
  process.env.SUPER_ADMIN_NAME = "Founder";
  process.env.SUPER_ADMIN_EMAIL = " Founder@SoilStack.example ";

  const first = await t.action(internal.seed.seedSuperAdmin, {});
  expect(first).toMatchObject({ created: true, email: "founder@soilstack.example" });
  const password = first.created ? first.password : "";
  expect(password).toHaveLength(16);

  const user = await userByEmail(t, "founder@soilstack.example");
  expect(user).toMatchObject({ name: "Founder", status: "active", mustChangePassword: true });
  expect((await signIn(t, "founder@soilstack.example", password)).tokens).toBeTruthy();

  const second = await t.action(internal.seed.seedSuperAdmin, {});
  expect(second).toEqual({ created: false, message: "A Super Admin already exists." });
  const users = await t.run((ctx) => ctx.db.query("users").collect());
  expect(users).toHaveLength(1);
});
