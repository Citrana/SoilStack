import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Tells the Next.js site that published content changed, so it drops the
 * cached pages using these tags (src/app/api/revalidate/route.ts).
 * Scheduled by the publishing mutations (ctx.scheduler.runAfter(0, ...)),
 * so it only runs when they succeed. Never throws: the site also refreshes
 * on its own (cacheLife), a lost notification only delays an update.
 */
export const notify = internalAction({
  args: { tags: v.array(v.string()) },
  returns: v.null(),
  handler: async (_ctx, { tags }) => {
    const siteUrl = process.env.SITE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!siteUrl || !secret) {
      console.warn("revalidate.notify: SITE_URL or REVALIDATE_SECRET not set; skipped.", tags);
      return null;
    }
    try {
      const response = await fetch(new URL("/api/revalidate", siteUrl), {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({ tags }),
      });
      if (!response.ok) {
        console.warn(`revalidate.notify: site answered ${response.status}`, tags);
      }
    } catch (error) {
      console.warn("revalidate.notify: site unreachable", tags, String(error));
    }
    return null;
  },
});
