import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DEFAULT_PAGES } from "./lib/defaultContent";
import { newSection, type Section } from "./lib/sections";
import { EMPTY_SETTINGS } from "./lib/settings";
import { asUser, insertRole, insertUserWithRole, setupTest, type T } from "./lib/test.utils";

async function setup() {
  const t = await setupTest();
  await t.mutation(internal.pages.seedContent, {});
  const adminId = await insertUserWithRole(t, "super_admin");
  return { t, adminId };
}

async function storeImage(t: T, adminId: Id<"users">) {
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(10)], { type: "image/webp" })));
  const result = await asUser(t, adminId).mutation(api.media.saveMedia, {
    storageId,
    filename: "field.webp",
    alt: { fr: "Champ", en: "Field" },
    width: 1200,
    height: 800,
    blurDataUrl: "data:image/webp;base64,x",
  });
  if (!result.ok) throw new Error("refused");
  return result.mediaId;
}

const draftWith = (title: string, extra: Partial<Section> = {}) => {
  const sections = structuredClone(DEFAULT_PAGES.home.sections);
  sections[0] = { ...sections[0], title: { fr: title, en: title }, ...extra } as Section;
  return { key: "home" as const, seo: DEFAULT_PAGES.home.seo, sections };
};

test("the content seed creates six published pages and settings once, and never overwrites edits", async () => {
  const { t, adminId } = await setup();
  await asUser(t, adminId).mutation(api.pages.saveDraft, draftWith("Edited"));
  const again = await t.mutation(internal.pages.seedContent, {});
  expect(again.created).toEqual([]);
  const pages = await t.run((ctx) => ctx.db.query("pages").collect());
  expect(pages.map((p) => p.key).sort()).toEqual(["about", "contact", "home", "innovation", "projects", "solutions"]);
  expect(pages.every((p) => p.published !== null)).toBe(true);
  const home = pages.find((p) => p.key === "home")!;
  expect((home.draft.sections[0] as { title: { fr: string } }).title.fr).toBe("Edited");
  expect(await t.run((ctx) => ctx.db.query("siteSettings").collect())).toHaveLength(1);
});

test("saveDraft needs pages.edit, keeps the public page unchanged, and audits", async () => {
  const { t, adminId } = await setup();
  const writerId = await insertUserWithRole(t, "blog_writer");
  await expect(asUser(t, writerId).mutation(api.pages.saveDraft, draftWith("Nope"))).rejects.toThrow(/pages\.edit/);
  await expect(t.mutation(api.pages.saveDraft, draftWith("Nope"))).rejects.toThrow(/NOT_AUTHENTICATED/);

  await asUser(t, adminId).mutation(api.pages.saveDraft, draftWith("Brouillon"));
  const live = await t.query(api.pages.getPublished, { key: "home" });
  expect((live!.sections[0] as { title: { fr: string } }).title.fr).toBe(
    (DEFAULT_PAGES.home.sections[0] as { title: { fr: string } }).title.fr,
  );
  const list = await asUser(t, adminId).query(api.pages.listForAdmin, {});
  expect(list.find((p) => p.key === "home")?.hasUnpublishedChanges).toBe(true);
  const log = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(log.map((l) => [l.action, l.entityTable])).toEqual([["update", "pages"]]);

  // Saving the same content again writes nothing.
  await asUser(t, adminId).mutation(api.pages.saveDraft, draftWith("Brouillon"));
  expect(await t.run((ctx) => ctx.db.query("auditLogs").collect())).toHaveLength(1);
});

test("saveDraft validates sections", async () => {
  const { t, adminId } = await setup();
  const hero = newSection("hero");
  await expect(
    asUser(t, adminId).mutation(api.pages.saveDraft, { key: "home", seo: DEFAULT_PAGES.home.seo, sections: [hero, hero] }),
  ).rejects.toThrow(/INVALID_INPUT/);
});

test("publish needs pages.publish, makes the draft live, audits and schedules a revalidation", async () => {
  const { t } = await setup();
  const editorRole = await insertRole(t, "draft_only", ["pages.edit"]);
  const editorId = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Drafter",
      email: "drafter@example.com",
      roleId: editorRole,
      status: "active",
      mustChangePassword: false,
      createdBy: null,
    }),
  );
  await asUser(t, editorId).mutation(api.pages.saveDraft, draftWith("Nouveau titre"));
  await expect(asUser(t, editorId).mutation(api.pages.publish, { key: "home" })).rejects.toThrow(/pages\.publish/);

  const contentEditorId = await insertUserWithRole(t, "content_editor");
  await asUser(t, contentEditorId).mutation(api.pages.publish, { key: "home" });
  const live = await t.query(api.pages.getPublished, { key: "home" });
  expect((live!.sections[0] as { title: { fr: string } }).title.fr).toBe("Nouveau titre");

  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled.map((s) => [s.name, s.args])).toEqual([["revalidate:notify", [{ tags: ["page:home"] }]]]);
  const actions = (await t.run((ctx) => ctx.db.query("auditLogs").collect())).map((l) => l.action);
  expect(actions).toEqual(["update", "publish"]);
});

test("discardDraft restores the published version", async () => {
  const { t, adminId } = await setup();
  await asUser(t, adminId).mutation(api.pages.saveDraft, draftWith("À jeter"));
  await asUser(t, adminId).mutation(api.pages.discardDraft, { key: "home" });
  const page = await asUser(t, adminId).query(api.pages.getForAdmin, { key: "home" });
  expect(page?.draft).toEqual(DEFAULT_PAGES.home);
  expect(page?.hasUnpublishedChanges).toBe(false);
});

test("getPublished hides hidden sections, never exposes the draft or editors, and fills contact info", async () => {
  const { t, adminId } = await setup();
  await asUser(t, adminId).mutation(api.settings.update, {
    phone: "+243 81 000 0000",
    whatsapp: "",
    email: "Hello@SoilStack.cd",
    address: { fr: "Goma", en: "Goma" },
    mapUrl: "",
    socials: {},
    tagline: { fr: "", en: "" },
    footerText: { fr: "", en: "" },
  });
  const contactPage = await t.query(api.pages.getPublished, { key: "contact" });
  expect(contactPage!.sections.find((s) => s.type === "contactInfo")).toMatchObject({
    contact: { phone: "+243 81 000 0000", email: "hello@soilstack.cd" },
  });
  expect(Object.keys(contactPage!).sort()).toEqual(["key", "publishedAt", "sections", "seo"]);

  const sections = structuredClone(DEFAULT_PAGES.home.sections);
  sections[1] = { ...sections[1], hidden: true };
  await asUser(t, adminId).mutation(api.pages.saveDraft, { key: "home", seo: DEFAULT_PAGES.home.seo, sections });
  await asUser(t, adminId).mutation(api.pages.publish, { key: "home" });
  const home = await t.query(api.pages.getPublished, { key: "home" });
  expect(home!.sections.map((s) => s.id)).toEqual(sections.filter((s) => !s.hidden).map((s) => s.id));
});

test("images used by a draft or a published page can't be deleted", async () => {
  const { t, adminId } = await setup();
  const mediaId = await storeImage(t, adminId);
  await asUser(t, adminId).mutation(api.pages.saveDraft, draftWith("Avec image", { image: mediaId } as Partial<Section>));
  await expect(asUser(t, adminId).mutation(api.media.remove, { mediaId })).rejects.toThrow(/MEDIA_IN_USE/);

  await asUser(t, adminId).mutation(api.pages.publish, { key: "home" });
  const live = await t.query(api.pages.getPublished, { key: "home" });
  expect(live!.sections[0]).toMatchObject({ image: { width: 1200, alt: { fr: "Champ" } } });

  // Removed from the draft but still live: still protected.
  await asUser(t, adminId).mutation(api.pages.saveDraft, draftWith("Sans image"));
  await expect(asUser(t, adminId).mutation(api.media.remove, { mediaId })).rejects.toThrow(/MEDIA_IN_USE/);
  // Published without it: free to delete.
  await asUser(t, adminId).mutation(api.pages.publish, { key: "home" });
  await asUser(t, adminId).mutation(api.media.remove, { mediaId });
});

test("resetContentToDefaults rewrites the text of every page and the tagline, keeps images and other settings, and audits", async () => {
  const { t, adminId } = await setup();
  const mediaId = await storeImage(t, adminId);
  await asUser(t, adminId).mutation(api.pages.saveDraft, draftWith("Old title", { image: mediaId } as Partial<Section>));
  await asUser(t, adminId).mutation(api.pages.publish, { key: "home" });
  await t.run(async (ctx) => {
    const row = (await ctx.db.query("siteSettings").first())!;
    await ctx.db.patch("siteSettings", row._id, { phone: "+243 999 000 000", tagline: { fr: "Ancien", en: "Old" } });
  });
  const logsBefore = (await t.run((ctx) => ctx.db.query("auditLogs").collect())).length;

  const result = await t.mutation(internal.pages.resetContentToDefaults, {});
  expect(result.reset).toEqual(["home", "about", "solutions", "innovation", "projects", "contact", "siteSettings"]);

  const home = await t.run((ctx) => ctx.db.query("pages").withIndex("by_key", (q) => q.eq("key", "home")).unique());
  const hero = home!.published!.sections[0] as Extract<Section, { type: "hero" }>;
  expect(hero.title).toEqual((DEFAULT_PAGES.home.sections[0] as Extract<Section, { type: "hero" }>).title);
  expect(hero.image).toBe(mediaId);
  expect(home!.draft).toEqual(home!.published);
  const usages = await t.run((ctx) => ctx.db.query("mediaUsages").withIndex("by_mediaId", (q) => q.eq("mediaId", mediaId)).collect());
  expect(usages.length).toBeGreaterThan(0);

  const settings = await t.run((ctx) => ctx.db.query("siteSettings").first());
  expect(settings!.phone).toBe("+243 999 000 000");
  expect(settings!.tagline).toEqual(EMPTY_SETTINGS.tagline);

  const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(logs.length - logsBefore).toBe(7);
  expect(logs.slice(logsBefore).every((l) => l.action === "update" && l.actorId === adminId)).toBe(true);
});

test("resetContentToDefaults refuses without a Super Admin to record as the actor", async () => {
  const t = await setupTest();
  await t.mutation(internal.pages.seedContent, {});
  await expect(t.mutation(internal.pages.resetContentToDefaults, {})).rejects.toThrow(/Super Admin/);
});
