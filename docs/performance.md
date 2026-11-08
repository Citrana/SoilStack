# Performance

How the public site is measured, and the latest results. Re-run after any
change to the public pages (`src/app/[locale]/(site)`, `src/components/site`).

## Method

- Production build: `pnpm build && pnpm exec next start -p 3300`.
- Headless Chrome driven over the DevTools protocol, cold cache, emulating
  a phone: 390×844 at 2×, **Slow 4G** (150 ms round trip, 1.6 Mbps down,
  750 kbps up — Lighthouse's values) and **4× CPU slowdown**.
- Recorded per page: LCP, CLS, time to first byte, bytes over the wire
  (total, JavaScript, HTML, images) and the number of requests.

## Results (2026-11-08, starter content, no photos uploaded yet)

| Page | LCP | CLS | Total | JS | HTML | Requests |
|---|---|---|---|---|---|---|
| `/fr` before | 656 ms | 0 | 279 KB | 176 KB | 18 KB | 20 |
| `/fr` after | 764 ms | 0 | 254 KB | 173 KB | **10 KB** | 20 |
| `/fr/produits` before | 664 ms | 0 | 287 KB | 176 KB | 33 KB | 23 |
| `/fr/produits` after | 640 ms | 0 | 266 KB | 173 KB | **17 KB** | 23 |
| `/fr/blog` before | 612 ms | 0 | 302 KB | 176 KB | 29 KB | 28 |
| `/fr/blog` after | 612 ms | 0 | 280 KB | 173 KB | **13 KB** | 28 |
| `/fr/contact` before | 612 ms | 0 | 257 KB | 176 KB | 15 KB | 16 |
| `/fr/contact` after | 612 ms | 0 | 246 KB | 173 KB | **7 KB** | 16 |

LCP stays well under the 2.5 s target and nothing shifts (CLS 0). LCP
differences of ~100 ms between runs are noise at this level. Real photos
will add image bytes: they are resized to WebP on upload and served by
`next/image` as AVIF/WebP at the right size, with the hero preloaded.

## What changed

- **Translations:** every public page used to embed *all* messages (admin
  included, ~26 KB of JSON). Public pages now send none to the browser —
  server components translate on the server, and the navbar passes its
  labels to the phone menu and language switcher as props. The admin
  layout provides all messages to its own client components. HTML is about
  half the size it was.
- **Convex code in the public bundle:** the phone menu imported
  `convex/lib/pages.ts`, which also defined a Convex validator, so
  `convex/values` (~15 KB compressed) shipped to every visitor. The
  validator moved to `convex/lib/pageKey.ts`; `pages.ts` is plain data.
- **Images:** optimized copies are cached 31 days (`minimumCacheTTL`) —
  a Convex storage URL always serves the same file.

## What's left (not worth more work today)

- ~165 KB of the JavaScript is React and the Next.js runtime itself.
- next-intl's message formatter (~12 KB) still loads: its client
  provider bundles it even when nothing translates in the browser.
- lucide's small shared icon base (~6 KB) loads with the library.
