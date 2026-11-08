@AGENTS.md

# SoilStack — Company website

The public website of SoilStack, an agri-tech company in the DRC, plus the
admin dashboard that manages its content. Stack: Next.js (App Router,
Cache Components), TypeScript (strict), Tailwind, shadcn/ui, Convex (data +
file storage), next-intl.

- **Public site** (no accounts, no cart, no checkout — browse only):
  company pages (home, about, solutions, innovation, projects, contact),
  blog, product catalogue.
- **Admin** (`/[locale]/admin`, login required): pages' content, blog
  posts, products, projects, images, site settings, users and roles.

This file records **permanent rules**. They apply to every feature built in
this repo, now and later — do not relax them for convenience.

## Permissions & security

- Every Convex function that reads or writes admin data enforces
  permissions server-side, through shared wrappers in `convex/lib/rbac.ts`.
  Never rely on hiding UI elements as a substitute for a server-side check
  — the client is not trusted.
- RBAC is **User -> Role -> Permissions** (`users.roleId` -> `roles` ->
  `rolePermissions` -> `permissions`). There is no direct user-to-permission
  link and no scopes.
- Every admin function is built with `authedQuery` / `authedMutation` /
  `authedAction` (convex-helpers custom functions, `convex/lib/rbac.ts`) and
  calls `ctx.requirePermission("<key>")` for the permission it needs.
  Permissions are read fresh on every call (never cached), so a role change
  takes effect immediately.
- Permission keys are a typed catalog in `convex/lib/permissions.ts`
  (`PERMISSIONS`, `PermissionKey`). A new key goes there, then into
  `messages/{fr,en}.json` under `Permissions` (nested: `pages.edit` ->
  `Permissions.pages.edit`), then `npx convex run seed:seedReferenceData`
  (idempotent). Starter roles and later grants to existing roles are
  one-shot `SEED_STEPS` (applied once, recorded in `appliedSeedSteps`), so
  a role an admin edited or deleted stays that way.
- The **Super Admin** role is a locked system role: it always holds every
  permission (the seed syncs new keys onto it), it can't be edited or
  deleted, and the last active Super Admin can't be demoted or blocked.
  Nobody can change their own role or status. Only `roles.manage` holders
  (the Super Admin by default) create roles; assigning a role or creating
  / resetting a Super Admin also needs `roles.manage`.
- **Public queries** (the ones the public site calls) need no login. They
  return **published** content only, shaped for the public (no drafts,
  author ids or internal fields — `convex/lib/publicShape.ts`). There is
  **no public mutation**: visitors never write to the database.
- Frontend: `useCan(key)` (`src/lib/use-can.ts`) hides UI only. Skip
  (`"skip"`) queries the user can't run rather than letting them throw.
- **Errors**: a Convex function throws only `appError(code, message)`
  (`convex/lib/errors.ts`). Codes are a typed list; the admin shows
  `Errors.<code>` from the message files through `useErrorMessage()`
  (`src/lib/errors.ts`), so errors are translated too. A new code goes in
  `ERROR_CODES` and both message files (a test checks it).

## Content model

- Every piece of content exists in **both languages**. Localized fields use
  the shared validators in `convex/lib/i18n.ts`: `loc` (`{ fr, en }`
  strings) and `locRich` (`{ fr, en }` TipTap JSON). Never add a
  single-language text field to content.
- Content is `draft` until published (products can also be `archived`).
  Pages keep a `draft` and a `published` copy of their sections, so editing
  never changes the live site until someone with `pages.publish` publishes.
- Page layouts are a fixed set of typed sections (hero, feature grid,
  accordion, bento, …). Admins edit their text and images, reorder and hide
  them; they don't invent new layouts. A new section type is added in code
  (validator + admin editor + public renderer + both languages).
- Rich text is TipTap JSON, **sanitized** on the server by
  `sanitizeRichText` (`convex/lib/richText.ts`): unknown nodes/marks and
  unsafe links are refused, extra attributes dropped, images referenced
  only by library id (`mediaImage { mediaId }`). The public site renders it
  with its own `RichText` component (`src/components/site/rich-text.tsx`) -
  no TipTap and never raw HTML on public pages. The admin editor
  (`src/components/admin/blog/rich-text-editor.tsx`) only enables what the
  allow-list accepts; extend both together.
- Blog posts have **one slug for both languages** (`/fr/blog/<slug>`,
  `/en/blog/<slug>`), unique, made by `slugify` / checked by `cleanSlug`
  (`convex/lib/posts.ts`). Permissions: `blog.write` creates and edits
  **own drafts**; `blog.edit_all` edits any post (published edits go live
  on save); `blog.publish` publishes/unpublishes and requires title,
  summary and text in both languages; only drafts can be deleted.
- Products (`convex/products.ts`) follow the same model: one slug for both
  languages (`convex/lib/slugs.ts`), status `draft | published |
  archived`. `products.manage` creates/edits/archives products and manages
  categories; `products.publish` publishes (needs name + short
  description in both languages and at least one photo). Published
  products are archived, never deleted; only drafts can be deleted, and a
  category is deleted only when no product uses it. There is no cart or
  checkout: product pages offer "Order on WhatsApp" (when a number is set
  in Settings) or Contact.
- Projects (`convex/projects.ts`) have a **stage** (`planned |
  in_progress | completed`, the badge) besides their publish status, and a
  manual display order (`order`, ↑↓ in the admin). One permission,
  `projects.manage`, does everything (the Content Editor holds it by a
  seed step); publishing needs title, summary and story in both
  languages; only drafts are deleted. They appear on the site through the
  `projectsList` section and their own `/projets/<slug>` pages.
- Page sections live in `convex/lib/sections.ts` (validators,
  `validateSections`, `newSection`, and `resolveSections`, the one pure
  function both `pages.getPublished` and the admin preview use). Their
  public renderers are in `src/components/site/sections/` and must stay
  free of server-only APIs (the admin preview renders them client-side).
- Publishing (and saving settings) schedules `internal.revalidate.notify`
  with the cache tags it changed (`page:<key>`, `settings`); public
  loaders in `src/lib/content.ts` tag their cache with the same names
  (`convex/lib/pages.ts`, `convex/lib/posts.ts`). A new public content
  type adds its tags to both and to `src/lib/revalidate-request.ts`.
- Dynamic public routes (e.g. `/blog/[slug]`) need `generateStaticParams`
  returning **at least one** param with Cache Components (a placeholder
  that renders `notFound()` when there's no content yet), and read the
  param inside `<Suspense>` so new content is served without a rebuild.

## Images

- Images live in Convex file storage, tracked in the `media` table (alt
  text in both languages, width, height, tiny blur placeholder).
- The admin resizes images in the browser before upload (longest side ≤
  2000px, WebP) — `src/lib/image.ts`. The server checks type and size.
- Public pages render images only with `next/image` (AVIF/WebP, correct
  `sizes`, blur placeholder, lazy by default, `priority` only for the
  above-the-fold hero). Always pass width/height to avoid layout shift.
- **Every feature that stores image references** (a cover, a gallery, an
  image inside rich text) calls `setMediaUsages(ctx, { ownerTable,
  ownerId }, [{ mediaId, field }])` (`convex/lib/media.ts`) in the same
  mutation that saves them, and `clearMediaUsages` when the owner is
  deleted. `media.remove` refuses an image that still has a usage
  (`MEDIA_IN_USE`) and deletes its file from storage when it goes.
- Public queries return images only through `publicImage(ctx, mediaId)`
  (url, width, height, blurDataUrl, alt) - never the raw `media` row.
- Browsing/picking images needs any of `MEDIA_BROWSE_PERMISSIONS`
  (uploaders and every content editor); uploading needs `media.upload`,
  deleting `media.delete`. Editors pick images with `<MediaPicker>`
  (`src/components/admin/media-picker.tsx`).
- `saveMedia` *returns* a refusal (`{ ok: false, code }`) after deleting a
  refused file instead of throwing: a thrown error would roll the deletion
  back. Use the same pattern whenever a mutation must keep a side effect
  while refusing.
- Uploads abandoned before `saveMedia` leave orphan files in storage; a
  cleanup cron is still to do.

## Performance (slow connections)

- Public pages are **Server Components**. They load data with
  `fetchQuery` (`src/lib/convex-server.ts`) inside `"use cache"` functions
  with `cacheLife` and `cacheTag`; publishing in the admin revalidates the
  matching tags through `/api/revalidate` (shared secret).
- The public site ships **no Convex client** and as little client JS as
  possible: only small interactive bits (menu, accordion, language
  switcher) are client components. The Convex React client is loaded only
  under `/admin`.
- No third-party scripts or embeds on public pages. Fonts come from
  `next/font` (self-hosted).
- Public pages send **no translations to the browser**: the root layout
  passes only `PUBLIC_CLIENT_NAMESPACES` (`src/i18n/public-messages.ts`,
  empty today) and public client components get their labels as props
  from server components; the admin layout provides all messages. A test
  fails if a public client component calls `useTranslations`.
- Files imported by public client components must not import Convex
  (`convex/values`, `_generated`): e.g. `convex/lib/pages.ts` is plain data
  and its validator lives in `convex/lib/pageKey.ts`.
- Measure with the method in `docs/performance.md` after changing public
  pages; update its table.

## SEO

- `metadataBase` comes from `NEXT_PUBLIC_SITE_URL` (`src/lib/site-url.ts`).
  Titles use the template `"%s — SoilStack"`; company pages and the blog /
  products lists set `title.absolute` (their text already ends with
  "— SoilStack").
- Next merges `openGraph` shallowly: a page that sets `openGraph` must
  spread `baseOpenGraph(locale)` (`src/lib/metadata.ts`) first, or it loses
  the site name and default share image (`[locale]/opengraph-image.tsx`).
- `src/app/sitemap.ts` lists every public URL in FR and EN via
  `buildSitemap` (`src/lib/seo.ts`); a new public content type adds its
  published slugs there. `robots.ts` hides the admin, and everything on
  non-production deployments.
- Structured data goes through `<JsonLd>` (`src/components/site/json-ld.tsx`,
  escapes `<`): Organization on Home, BlogPosting, Product.
- Unknown articles, products and projects call `notFound()` inside the
  streamed content: the status stays 200 and Next adds
  `<meta name="robots" content="noindex">` (Next 16 docs), shown in the
  site frame by `(site)/not-found.tsx`. A real 404 would need a lookup in
  the proxy on every request — not done on purpose.

## Money

- Product prices are **USD only** and optional: `priceCents` is an integer
  in cents; missing means "Price on request". Never store money as a float.
  Parse and format only with `convex/lib/money.ts` (`parseUsdToCents`,
  `formatUsd`, `centsToInput`). Input is unambiguous on purpose: spaces
  group thousands, one `.` or `,` is the decimal separator ("12.345" is
  refused, not guessed).

## Audit logging

- Every create, update, delete, publish and unpublish in the admin writes
  an entry to `auditLogs` in the same mutation, through `ctx.audit({...})`
  (or `logAudit` in internal mutations — `convex/lib/audit.ts`).
- Creates log the full new record as `after`, deletes the full old record
  as `before`, updates only the changed fields (`diff(...)`).
- **Never** put secrets (passwords, tokens) in a snapshot.
- `auditLogs` is **append-only**: never patched or deleted (a runtime guard
  in `authedMutation`'s `ctx.db` and a source-scanning test enforce it).
  Read on `/admin/audit`, gated by `audit.view`.

## Internationalization

- The site supports **French (default) and English**, always. Every piece
  of UI — public or admin — ships with both languages from the start. A
  feature with only one language is not done.
- UI strings live in `messages/fr.json` and `messages/en.json` (via
  `next-intl`), never hardcoded in components. Add a key to both files
  together, in the same commit.
- Routing is locale-prefixed (`/fr/...`, `/en/...`) via
  `src/i18n/routing.ts` and `src/proxy.ts`; `/` redirects to `/fr`. Public
  routes have **localized pathnames** (`/fr/a-propos`, `/en/about`): every
  new route is declared in `routing.pathnames`. Routes go under
  `src/app/[locale]/`, and links use `Link` from `@/i18n/navigation`.
- Use `getTranslations` / `useTranslations` scoped per component/page
  (e.g. `"Home"`) rather than a flat global namespace. Server pages call
  `setRequestLocale(locale)`.

## Design

- Clean and modern, green/earth tones. Tokens are CSS variables in
  `src/app/[locale]/globals.css` (forest, leaf, lime-tint, soil, sand,
  ink); use them through Tailwind (`bg-forest`, `text-leaf`, `bg-primary`,
  …), never hardcoded hex values in components.
- UI is **mobile-first**: design for ~360px wide first (tap targets ≥ 44px,
  no horizontal page scroll).
- The public navbar shows its links from `lg` (7 entries) and the phone
  menu below; check 1024px when adding an entry.
- Admin forms: fields the user must fill in use `<Label required>`;
  localized fields use `<LocalizedField>` (`src/components/admin/
  localized-field.tsx`). Inputs, selects and buttons are 44px tall on
  phones and compact from `md` (built into `src/components/ui/`).
- Admin lists use the shared `DataTable` (`src/components/data-table/`,
  usage in its README) - don't hand-roll tables; give it `renderCard` or
  `meta.hideBelow` for phones.
- **Admin pages** (`src/app/[locale]/admin/**/page.tsx`) are tiny server
  files that render `<AuthGate><SomePanel /></AuthGate>` (client panel from
  `src/components/admin/`). The layout's `AdminFrame` adds the shell and
  must **always render `children`**: with Cache Components, a layout that
  withholds the page segment on the server makes Next.js never stream it,
  and the browser tab hangs. Gate inside the page, never by not rendering
  `children` in a layout. A new section adds its route to
  `routing.pathnames` and its entry to `ADMIN_NAV`
  (`src/components/admin/admin-shell.tsx`, with its permission).

## Data changes need the owner's approval first

Once the site holds real content in production, before implementing any
change that **affects data**, stop and inform the owner, and start only
after they explicitly approve. This applies to every AI assistant and
contributor, for every change.

- **What counts as affecting data:** schema changes (new, changed or
  removed tables, fields or indexes, or a field becoming required);
  migrations or backfills; anything that rewrites, archives or deletes
  stored records; changes to seeded reference data (permissions, system
  roles, default pages); imports, exports or resets; any command run
  against a deployment's data (`npx convex run`, `import`, `env set`, and
  anything with `--prod`).
- **What to tell the owner, before writing the code:** what will change
  and in which tables; what happens to existing records on prod; whether
  it can be undone, and how; which commands must run after deploy; whether
  a backup should be taken first.
- **Wait for a clear "yes".** Approval for one change doesn't carry over to
  the next one.
- A purely read-only change (a new query, a UI change, docs) doesn't need
  this step. When in doubt, ask.

## Workflow

- Prefer small, focused commits.
- Every feature ships with basic tests for its Convex logic. This is
  non-negotiable — no Convex query, mutation, or action merges without a
  test covering its main behavior and its permission checks (and, for
  public queries, that drafts and internal fields never leak).
- **Git flow**: `main` (production) and `develop` (integration). Work on a
  branch from `develop`, open a PR into `develop` using the PR template
  (`.github/PULL_REQUEST_TEMPLATE.md`); releases are a PR `develop` ->
  `main`.
- **Branch naming**: `<type>/<kebab-case-description>`, e.g.
  `feat/add-login-page`, `fix/broken-product-price`. Allowed types: `feat`,
  `fix`, `refactor`, `chore`, `docs`, `test`. `main` and `develop` are the
  only exceptions. This is enforced by a Husky `pre-commit` hook
  (`.husky/pre-commit`) — a badly named branch fails the commit outright.
- **Tests gate every commit**: the same `pre-commit` hook runs `pnpm test`
  (Vitest). Any failing test blocks the commit. Hooks are installed
  automatically by `pnpm install` (via the `prepare` script).
- Node 22+ is required (Convex CLI); `.nvmrc` pins it (`nvm use`).
- **Deployment:** production follows `main` (Vercel + Convex prod; build
  command and preview rule in `vercel.json`). `docs/deployment.md` is the
  guide. A release that needs commands on prod (env vars, seeds,
  migrations) gets a row in its **release log** (section 11) in the same
  PR: settings before the merge into `main`, seeds/migrations after.

## Authentication

- Authentication is Convex Auth (`@convex-dev/auth`), email + password only.
  There is no public sign-up — the Password provider rejects the `signUp`
  flow. Accounts are created exclusively by a `users.manage` holder
  (`createUser` in `convex/users.ts`), which generates a strong temporary
  password (`convex/lib/password.ts`) shown to the admin exactly once and
  sets `mustChangePassword`. Users must change it at first login and can
  change their password at any time. A Super Admin resets a forgotten
  password the same way (new temporary password, `mustChangePassword`).
- `users.status` (`"active" | "blocked"`) is enforced in Convex Auth's
  `beforeSessionCreation` callback (`convex/auth.ts`) and re-checked on
  every call by `getCurrentUserOrNull` (`convex/lib/auth.ts`).
- Admin route protection is client-side (`src/components/auth-gate.tsx`,
  `useConvexAuth()`); the real security boundary is the server-side
  `convex/lib/rbac.ts` wrappers.
- The first Super Admin is bootstrapped once by the internal
  `seed:seedSuperAdmin` from the `SUPER_ADMIN_NAME` / `SUPER_ADMIN_EMAIL`
  Convex env vars: it generates the password, prints it once, and forces a
  change at first sign-in. No password is ever stored in env.
- Convex Auth needs `JWT_PRIVATE_KEY`, `JWKS` and `SITE_URL` on each
  deployment (README, "Authentication setup").

## Project layout

```
convex/
  schema.ts         # single source of truth for all tables
  auth.ts           # Convex Auth config (Password provider, callbacks)
  seed.ts           # reference data (permissions, Super Admin, pages) + first Super Admin
  rbac.ts users.ts  # roles/permissions, user accounts
  <domain>.ts       # one file per domain (pages, posts, products, media, …)
  <domain>.test.ts  # tests for that domain's Convex logic
  lib/              # shared server-side helpers (see convex/lib/README.md)
messages/
  fr.json           # UI strings, French (default)
  en.json           # UI strings, English — kept in lockstep with fr.json
src/
  app/[locale]/     # App Router routes, locale-prefixed
    (site)/         # public pages (Server Components)
    admin/          # admin dashboard (client, behind AuthGate)
  components/       # UI (shadcn primitives in components/ui/, site/, admin/)
  i18n/             # next-intl routing, navigation, request config
  lib/              # client/server utilities
  proxy.ts          # locale-detection proxy (Next.js's middleware convention)
```

## Current status

This repo has: project setup (Next.js 16 with Cache Components, Tailwind
design tokens, next-intl with French default and localized pathnames,
Convex, Vitest + convex-test, Husky hook, PR template), and auth + RBAC:
Convex Auth (email + password, no sign-up), the permission catalog, the
locked Super Admin and three starter roles (Content Editor, Blog Writer,
Product Manager), the admin at `/[locale]/admin` (login, forced password
change, dashboard, `/admin/users`, `/admin/roles`, `/admin/audit`,
`/admin/account`) and the append-only audit log, and the image library
(`/admin/media`: browser-side resize to WebP, FR/EN alt text, usage
registry and delete guard, `MediaPicker`), and the company pages: public
home/about/solutions/innovation/projects/contact (floating navbar, typed
sections, footer from settings, cached with tag revalidation), the page
editor at `/admin/pages` (FR/EN draft, live preview, publish) and
`/admin/settings`, and the blog: public list (`/blog`, paginated) and
article pages, a latest-posts section, and the admin at `/admin/blog`
(TipTap editor per language, cover, tags, draft → publish), and the product
catalogue: public `/produits` with category filters and product pages
(gallery, price or "Price on request", WhatsApp order button, JSON-LD), a
featured-products section, and the admin at `/admin/products` (editor,
photos, archive) and `/admin/products/categories`, and the projects:
public project pages, a projects-list section, and `/admin/projects`
(ordered list, editor with stage, location, year, cover, gallery, story),
and SEO + performance: sitemap, robots, metadata and share image, icons,
structured data, a framed not-found page, no translations or Convex code
in the public bundle (`docs/performance.md`).
The deployment guide is written (`docs/deployment.md`, `vercel.json`); the
production setup itself (Convex prod, Vercel, domain) is still to be done
with the owner's accounts, following its section 4.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
