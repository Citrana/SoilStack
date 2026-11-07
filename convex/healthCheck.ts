import { query } from "./_generated/server";

/** Public liveness probe: lets the site and CI confirm Convex is reachable. */
export const ping = query({
  args: {},
  handler: async () => {
    return { ok: true, time: Date.now() };
  },
});
