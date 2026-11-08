import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { asUser, insertUserWithRole, setupTest } from "./lib/test.utils";

const fields = { slug: "drones", name: { fr: "Drones", en: "Drones" }, description: { fr: "", en: "" } };

test("the starter categories are seeded once, and deleting one sticks", async () => {
  const t = await setupTest();
  expect(await t.mutation(internal.productCategories.seedCategories, {})).toBe(4);
  const adminId = await insertUserWithRole(t, "super_admin");
  const list = await asUser(t, adminId).query(api.productCategories.list, {});
  expect(list.map((c) => c.slug)).toEqual(["engrais", "semences", "outils-equipements", "protection-cultures"]);
  await asUser(t, adminId).mutation(api.productCategories.remove, { categoryId: list[0]._id });
  expect(await t.mutation(internal.productCategories.seedCategories, {})).toBe(0);
  expect(await asUser(t, adminId).query(api.productCategories.list, {})).toHaveLength(3);
});

test("create, update and move need products.manage, validate, audit and refresh the catalogue", async () => {
  const t = await setupTest();
  const managerId = await insertUserWithRole(t, "product_manager");
  const writerId = await insertUserWithRole(t, "blog_writer");
  await expect(asUser(t, writerId).mutation(api.productCategories.create, fields)).rejects.toThrow(/products\.manage/);
  await expect(asUser(t, managerId).mutation(api.productCategories.create, { ...fields, name: { fr: "Drones", en: "" } })).rejects.toThrow(/INVALID_INPUT/);

  const a = await asUser(t, managerId).mutation(api.productCategories.create, fields);
  const b = await asUser(t, managerId).mutation(api.productCategories.create, { ...fields, slug: "outils" });
  await expect(asUser(t, managerId).mutation(api.productCategories.create, fields)).rejects.toThrow(/already used/);
  await asUser(t, managerId).mutation(api.productCategories.update, { categoryId: a, ...fields, name: { fr: "Drones agricoles", en: "Farm drones" } });
  await asUser(t, managerId).mutation(api.productCategories.move, { categoryId: b, direction: "up" });
  const list = await asUser(t, managerId).query(api.productCategories.list, {});
  expect(list.map((c) => c.slug)).toEqual(["outils", "drones"]);
  expect(list[1].name.en).toBe("Farm drones");

  const actions = (await t.run((ctx) => ctx.db.query("auditLogs").collect())).map((l) => l.action);
  expect(actions).toEqual(["create", "create", "update", "update"]);
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled.every((s) => JSON.stringify(s.args) === JSON.stringify([{ tags: ["products"] }]))).toBe(true);
});

test("a category used by a product can't be deleted", async () => {
  const t = await setupTest();
  const managerId = await insertUserWithRole(t, "product_manager");
  const categoryId = await asUser(t, managerId).mutation(api.productCategories.create, fields);
  await asUser(t, managerId).mutation(api.products.create, { name: { fr: "Drone DJI", en: "" }, categoryId });
  await expect(asUser(t, managerId).mutation(api.productCategories.remove, { categoryId })).rejects.toThrow(/CATEGORY_IN_USE/);
});
