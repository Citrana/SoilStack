import { v } from "convex/values";
import { query } from "./_generated/server";
import { internal } from "./_generated/api";
import { diff } from "./lib/audit";
import { SETTINGS_TAG } from "./lib/pages";
import { authedMutation, authedQuery } from "./lib/rbac";
import { cleanSettings, EMPTY_SETTINGS, settingsFields } from "./lib/settings";
import { loadSettings } from "./pages";

export const get = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requirePermission("settings.manage");
    return await loadSettings(ctx);
  },
});

/** Saves the settings (live at once) and refreshes every public page. */
export const update = authedMutation({
  args: settingsFields,
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.requirePermission("settings.manage");
    const settings = cleanSettings(args);
    const row = await ctx.db.query("siteSettings").first();
    const before = row ? await loadSettings(ctx) : EMPTY_SETTINGS;
    const changes = diff(before, settings);
    if (!changes) return null;
    let id = row?._id;
    if (id) {
      await ctx.db.replace("siteSettings", id, settings);
    } else {
      id = await ctx.db.insert("siteSettings", settings);
    }
    await ctx.audit({
      action: "update",
      entityTable: "siteSettings",
      entityId: id,
      before: changes.before,
      after: changes.after,
    });
    await ctx.scheduler.runAfter(0, internal.revalidate.notify, { tags: [SETTINGS_TAG] });
    return null;
  },
});

/** PUBLIC: contact details, social links and footer text. */
export const getPublic = query({
  args: {},
  handler: async (ctx) => await loadSettings(ctx),
});
