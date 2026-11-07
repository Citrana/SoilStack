import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { asUser, insertUserWithRole, setupTest } from "./lib/test.utils";

const VALID = {
  phone: " +243 81 000 0000 ",
  whatsapp: "+243810000000",
  email: "contact@soilstack.cd",
  address: { fr: "Goma, Nord-Kivu", en: "Goma, North Kivu" },
  mapUrl: "https://maps.google.com/?q=Goma",
  socials: { linkedin: "https://linkedin.com/company/soilstack", facebook: " " },
  tagline: { fr: "Slogan", en: "Tagline" },
  footerText: { fr: "", en: "" },
};

test("update needs settings.manage, trims values, audits and schedules a site-wide revalidation", async () => {
  const t = await setupTest();
  await t.mutation(internal.pages.seedContent, {});
  const adminId = await insertUserWithRole(t, "super_admin");
  const editorId = await insertUserWithRole(t, "content_editor");

  await expect(asUser(t, editorId).mutation(api.settings.update, VALID)).rejects.toThrow(/settings\.manage/);
  await expect(asUser(t, editorId).query(api.settings.get, {})).rejects.toThrow(/settings\.manage/);

  await asUser(t, adminId).mutation(api.settings.update, VALID);
  const saved = await t.query(api.settings.getPublic, {});
  expect(saved).toMatchObject({ phone: "+243 81 000 0000", socials: { linkedin: "https://linkedin.com/company/soilstack" } });
  expect(saved.socials).not.toHaveProperty("facebook");

  const log = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(log.map((l) => [l.action, l.entityTable])).toEqual([["update", "siteSettings"]]);
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled.map((s) => s.args)).toEqual([[{ tags: ["settings"] }]]);
  expect(await t.run((ctx) => ctx.db.query("siteSettings").collect())).toHaveLength(1);
});

test("update rejects malformed contacts and links", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  for (const bad of [
    { email: "not-an-email" },
    { phone: "call me" },
    { mapUrl: "http://maps.example" },
    { socials: { x: "javascript:alert(1)" } },
  ]) {
    await expect(asUser(t, adminId).mutation(api.settings.update, { ...VALID, ...bad })).rejects.toThrow(/INVALID_INPUT/);
  }
});
