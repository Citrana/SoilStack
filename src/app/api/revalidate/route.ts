import { revalidateTag } from "next/cache";
import { parseRevalidateRequest } from "@/lib/revalidate-request";

/**
 * Called by Convex (convex/revalidate.ts) after content is published, to
 * drop the cached public pages using these tags. Protected by the shared
 * REVALIDATE_SECRET.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const decision = parseRevalidateRequest(
    request.headers.get("authorization"),
    body,
    process.env.REVALIDATE_SECRET,
  );
  if (!decision.ok) {
    return Response.json({ ok: false }, { status: decision.status });
  }
  for (const tag of decision.tags) {
    // From outside a Server Action: expire now (Next 16 docs, revalidateTag).
    revalidateTag(tag, { expire: 0 });
  }
  return Response.json({ ok: true, revalidated: decision.tags });
}
