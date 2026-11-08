# Deployment and environments

How the SoilStack website is put online, what to set up the first time, and
the commands to run it day to day. Last updated 8 November 2026.

Related docs:
- `docs/performance.md`: how speed is measured, and the latest results.
- `README.md`: running the project locally.

> **Status:** nothing is deployed yet. Section 4 is the first-time setup,
> in order. Fill in the blanks (`…`) in sections 1 and 11 as you go.

---

## 1. The setup at a glance

| | Dev (your laptop) | Prod (the real website) |
|---|---|---|
| Convex deployment | `local-barakadan421-soilstack` (local, runs on your laptop) | `…` (cloud, created in section 4.1) |
| Convex URL | `http://127.0.0.1:3210` | `https://….convex.cloud` |
| Website | `http://localhost:3000` (`pnpm dev`) | `https://….vercel.app`, then your domain |
| Hosting | — | Vercel, project `soilstack` |
| Data | Test content only | The real content |
| Super Admin | Baraka Danny | `…` |

**Dev is local.** The dev database runs on your laptop while
`pnpm dlx convex dev` is running. Nothing in it reaches the website, and
nothing on the website reaches it.

**Vercel plan.** Vercel's free Hobby plan is for **non-commercial** use.
SoilStack is a company website, so use **Vercel Pro** (about $20/month)
from launch.

**The domain changes nothing in the data.** All content lives in Convex.
A domain only changes the address the website is served from (section 6).

---

## 2. Which commands touch which database

Locally, `.env.local` points at **dev**:
```
CONVEX_DEPLOYMENT=local:local-barakadan421-soilstack
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
```

| Command | Database |
|---|---|
| `pnpm dev`, `pnpm dlx convex dev` | dev |
| `npx convex run …`, `npx convex env …`, `npx convex export …` | dev |
| `pnpm test` | neither (in-memory test database) |
| Any command with `--prod` | **prod** |
| `npx convex deploy` | **prod**, always |

**Be careful with:**
- anything with `--prod`;
- `npx convex deploy`;
- **never** `npx convex import --replace-all --prod` unless you mean to
  wipe production;
- `pages:resetContentToDefaults`: it **rewrites the text of the six pages**
  with the starter copy (photos are kept). Run it on prod only with the
  owner's explicit approval (CLAUDE.md, "Data changes").

---

## 3. How a release goes live

Production follows the **`main`** branch.

1. Feature branch (e.g. `feat/…`) → PR into `develop`. Nothing deploys.
2. PR `develop` → `main`. **This goes live**, in 2–4 minutes:
   - Vercel runs the build command from `vercel.json`:
     `npx convex deploy --cmd 'pnpm run build'`;
   - it first pushes the Convex functions and schema to prod (with
     `CONVEX_DEPLOY_KEY`), then builds the website against prod
     (`convex deploy` sets `NEXT_PUBLIC_CONVEX_URL` for the build);
   - visitors get the new version on their next page load.

If the build fails, nothing changes and the previous version stays live.

**Check a release:** Vercel → **Deployments** shows a **Production** row
from `main` with status **Ready**; the Convex dashboard (Production) shows
"Last deployed … just now".

**Previews are skipped on purpose.** `vercel.json`'s `ignoreCommand`
builds production only: the deploy key is production-only, and
`robots.txt` hides non-production deployments from search engines anyway.

Before merging `develop` → `main`, check **section 11** for commands that
the release needs.

---

## 4. First-time setup

Run everything from the repo root, on `main`, with Node 22 (`nvm use`).

### 4.1 Convex prod

1. In the Convex dashboard, open the `soilstack` project and create its
   **Production** deployment if it doesn't exist yet. Write its name in
   section 1.
2. First push of the functions and schema:
   ```sh
   npx convex deploy
   ```
3. Sign-in keys (`JWT_PRIVATE_KEY`, `JWKS`) for prod. If the tool offers to
   edit files that already exist (`convex/auth.ts`…), **keep the repo's
   versions**:
   ```sh
   npx @convex-dev/auth --prod
   ```
4. Settings. Generate the revalidation secret once and **keep it**: the
   same value goes to Vercel in 4.3.
   ```sh
   node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
   npx convex env set --prod REVALIDATE_SECRET '<the value>'
   npx convex env set --prod SITE_URL 'https://soilstack.vercel.app'   # corrected in 4.4 if Vercel gives another URL
   npx convex env set --prod SUPER_ADMIN_NAME 'Baraka Danny'
   npx convex env set --prod SUPER_ADMIN_EMAIL '…'
   ```
5. Reference data and starter content: permissions, roles, the six pages
   (published), site settings, the 4 product categories and the 4 draft
   projects. It's safe to run again; it never overwrites edits.
   ```sh
   npx convex run --prod seed:seedReferenceData
   ```
   **Run this before the first Vercel build.** The build prerenders the
   company pages from prod; without the pages they'd be built as "not
   found" until the next deploy.
6. The first Super Admin. The command prints a **temporary password once**:
   copy it, and change it at the first sign-in. No password is ever stored
   in the settings.
   ```sh
   npx convex run --prod seed:seedSuperAdmin
   ```

**Prod environment variables** (the names, not the values):
- `SITE_URL`
- `JWT_PRIVATE_KEY`, `JWKS`
- `REVALIDATE_SECRET`
- `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`

### 4.2 Deploy key

- In the Convex dashboard: **Production → Settings → Deploy Keys → Create
  Deploy Key**, named `vercel`, no expiration.
- Give it **only** the `deployment:deploy` permission: Vercel only needs to
  push code. If the key leaked, it couldn't read the content, change
  settings or download backups.
- If a Vercel build fails with a Convex permission error, create a new key
  with the permission it names and replace it in Vercel.

### 4.3 Vercel project

- **Add New → Project →** import GitHub `Citrana/SoilStack`.
- **Framework:** Next.js; **root directory:** `./`. The build command
  and preview rule come from `vercel.json`, so leave those fields on their
  defaults.
- **Settings → Environments → Production → Branch Tracking:** `main`.
- **Node.js version:** 22.x (also set by `engines` in `package.json`).
- **Environment variables**, for **Production**:

  | Name | Value |
  |---|---|
  | `CONVEX_DEPLOY_KEY` | the key from 4.2 (mark it **Sensitive**) |
  | `REVALIDATE_SECRET` | the **same** value as on Convex (4.1) |
  | `NEXT_PUBLIC_SITE_URL` | `https://soilstack.vercel.app` (corrected in 4.4) |
  | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (uses the pnpm version from `package.json`) |

- **Don't** add `NEXT_PUBLIC_CONVEX_URL`: `convex deploy` sets it during
  the build.
- **Don't** add the "Convex" integration Vercel may offer: it would create
  a second, empty Convex database.
- **Deploy.**

### 4.4 Site URL

When the first deploy is Ready, take the production URL Vercel shows.
If it differs from what you set, correct both, then redeploy (Vercel →
Deployments → ⋯ → Redeploy):
```sh
npx convex env set --prod SITE_URL 'https://<the vercel url>'
```
and in Vercel: `NEXT_PUBLIC_SITE_URL` = the same URL.

What each one does:
- **`SITE_URL` (Convex):** used by sign-in, and by Convex to tell the
  website to refresh a page after something is published
  (`revalidate.notify` → `/api/revalidate`).
- **`NEXT_PUBLIC_SITE_URL` (Vercel):** the address used in the sitemap,
  share links and structured data.

### 4.5 Smoke test

- `/` opens in French; the FR/EN switch keeps you on the same page.
- `/fr/admin`: sign in with the temporary password and choose your own.
- Pages → Home: change a word, **Publish**, and reload the public home page.
  It updates within a few seconds. If it doesn't, see section 10.
- Upload an image in **Images**.
- `/sitemap.xml`, `/robots.txt` and `/fr/opengraph-image` open.

---

## 5. Go-live checklist

- [ ] Real text on the six pages (Pages), in French and English.
- [ ] Photos: home hero, about, projects, products (Images).
- [ ] Settings: phone, **WhatsApp** (it enables the "Order on WhatsApp"
      button on products), email, address, map link, social links.
- [ ] Products and categories; the projects (publish the drafts you keep,
      and add a "Projects list" section to the Projects page).
- [ ] The blog's first article.
- [ ] Real users with the right roles (Users, Roles). No shared accounts.
- [ ] Check the Contact page, the WhatsApp link and the share card on
      a phone.
- [ ] Backups on (section 8).
- [ ] Domain and Search Console (sections 6 and 7).

---

## 6. When the domain is bought

1. Make sure Vercel is on Pro.
2. **Vercel → Settings → Domains:** add the domain (and `www`), then add
   the DNS records Vercel shows at your domain provider.
3. Point everything at the new address, then redeploy:
   ```sh
   npx convex env set --prod SITE_URL 'https://your-domain'
   ```
   and in Vercel: `NEXT_PUBLIC_SITE_URL` = `https://your-domain`.
4. Admins sign in once more on the new address (sign-ins are saved per
   address). Accounts and content stay the same.

No data moves: the Convex prod deployment stays the same.

---

## 7. Google Search Console

1. Add the domain as a **Domain property** and verify it with the DNS TXT
   record Google gives you.
2. **Sitemaps:** submit `https://your-domain/sitemap.xml`. It lists every
   page in French and English and updates by itself when content is
   published.
3. A few days later, check **Pages**: both `/fr/…` and `/en/…` addresses
   should be indexed. Admin addresses are excluded by `robots.txt`.
4. Check a share preview with Facebook's Sharing Debugger, or by sending
   a link on WhatsApp.

---

## 8. Backups and restore

- **In the Convex dashboard** (Production → **Settings → Backup &
  Restore**): click **Backup Now** before the first real content goes in,
  and turn on scheduled backups if your plan offers them.
- **A weekly copy off the laptop**, photos included:
  ```sh
  npx convex export --prod --include-file-storage --path "$HOME/Documents/soilstack-prod-backup-$(date +%F).zip"
  ```
- **Restore drill** (do it once, to know it works): import a backup into
  your **dev** deployment, never prod, and open the site locally:
  ```sh
  npx convex import --replace-all soilstack-prod-backup-YYYY-MM-DD.zip   # dev only: replaces dev data
  ```
  Restoring prod itself is done from the dashboard's Backup & Restore
  page, after taking a fresh backup.

---

## 9. Day-to-day reminders

- When a release adds permissions, roles or starter content (a new
  `SEED_STEPS` entry or seed), run this after it's deployed:
  ```sh
  npx convex run --prod seed:seedReferenceData
  ```
- Watch usage on the plans:
  - Convex: database size, **file storage** (every photo) and bandwidth;
  - Vercel: image optimization and bandwidth.
- After changes to public pages, re-measure speed with the method in
  `docs/performance.md`.
- Uploads abandoned before saving leave unused files in storage. There's
  no automatic cleanup yet; check storage size now and then.

---

## 10. If something goes wrong

| What you see | Fix |
|---|---|
| Vercel build: "CONVEX_DEPLOY_KEY is not set" | Key missing or not ticked for Production; add it and redeploy |
| Vercel build fails about pnpm or the lockfile | Check `ENABLE_EXPERIMENTAL_COREPACK` = `1` and redeploy |
| Vercel build fails while "Generating static pages" | Prod has no content yet: run `seed:seedReferenceData --prod` (4.1 step 5), then redeploy |
| Convex permission error during the build | The deploy key needs another permission (4.2) |
| Site loads but sign-in fails | Check `JWT_PRIVATE_KEY`, `JWKS` and `SITE_URL` on prod, and that the user exists |
| Published changes don't appear | `REVALIDATE_SECRET` differs between Convex and Vercel, or `SITE_URL` is wrong. Convex dashboard → Logs: look for `revalidate.notify` warnings. Pages also refresh by themselves within an hour |
| Photos don't show | The Convex URL must be a `*.convex.cloud` address (allowed in `next.config.ts`) |
| Sitemap or share links show `localhost` | Set `NEXT_PUBLIC_SITE_URL` in Vercel and redeploy |
| A user can't see a menu | Their role lacks the permission: Admin → Roles |

---

## 11. Release log: prod steps per release

Some releases need commands on prod. Settings (`env set`) go **before** the
merge into `main`; seed and migration commands go **after** the deploy
shows Ready.

| Release | Before merging into `main` | After the deploy is Ready |
|---|---|---|
| First release (steps 1–8) | The whole of section 4.1–4.3 | 4.4, 4.5, then section 5 |
