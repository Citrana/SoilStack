# SoilStack

The public website of SoilStack, an agri-tech company in the DRC: company
pages, blog and product catalogue in **French (default) and English**, plus
an admin dashboard to manage the content.

Stack: [Next.js](https://nextjs.org) (App Router) · TypeScript (strict) ·
Tailwind CSS · [shadcn/ui](https://ui.shadcn.com) · [Convex](https://convex.dev) ·
[next-intl](https://next-intl.dev)

See [CLAUDE.md](./CLAUDE.md) for the permanent rules this codebase follows
(permissions, content model, images, performance, i18n, audit logging,
testing, git workflow).

## Requirements

- Node **22+** (the Convex CLI requires it). With nvm: `nvm use` (reads
  `.nvmrc`).
- pnpm 10 (`corepack enable`).

## Getting started

Install dependencies (this also installs the Git hooks):

```bash
pnpm install
```

Connect Convex (first time only — logs you in, links/creates a deployment,
and writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local`). Leave it running in
its own terminal tab while you develop, since it also pushes function
changes live:

```bash
pnpm dlx convex dev
```

> The repo may have been bootstrapped against an anonymous **local**
> Convex backend (`CONVEX_DEPLOYMENT=anonymous:...` in `.env.local`). Run
> `pnpm dlx convex login` and then `pnpm dlx convex dev` to link it to
> your Convex account and a cloud project.

Then, in a second terminal, seed the reference data (permissions, the
Super Admin role and the starter roles) — safe to run any number of times,
and worth re-running after pulling changes:

```bash
pnpm dlx convex run seed:seedReferenceData
```

Then run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to
`/fr` (or `/en` for an English browser).

## Authentication setup (first time only, per deployment)

The admin lives at `/fr/admin` (or `/en/admin`). There is no public
sign-up: accounts are created by an administrator.

1. **Signing keys.** Convex Auth needs `JWT_PRIVATE_KEY`, `JWKS` and
   `SITE_URL` on the deployment. The simplest way is
   `pnpm dlx @convex-dev/auth --web-server-url http://localhost:3000`
   (it may also offer to edit files that already exist — keep the repo's
   versions), or follow the
   [manual setup](https://labs.convex.dev/auth/setup/manual). Check with
   `pnpm dlx convex env list`.
2. **First Super Admin.** Set who it is, then run the seed once:

   ```bash
   pnpm dlx convex env set SUPER_ADMIN_NAME "Your Name"
   pnpm dlx convex env set SUPER_ADMIN_EMAIL you@example.com
   pnpm dlx convex run seed:seedSuperAdmin
   ```

   The output shows a **temporary password, once**. Log in at
   `/fr/admin/login` with it; you'll be asked to choose your own. Running
   it again does nothing once a Super Admin exists.
3. **Everyone else**: the Super Admin creates their accounts in
   **Users** and shares the temporary password shown once. A forgotten
   password is reset there too.

## Scripts

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Next.js dev server                            |
| `pnpm build`     | Production build                              |
| `pnpm lint`      | ESLint                                        |
| `pnpm typecheck` | TypeScript for the app and `convex/`          |
| `pnpm test`      | Vitest (Convex logic via `convex-test`)       |

## Contributing

- Branch from `develop`, named `<type>/<kebab-case-description>` (types:
  `feat`, `fix`, `refactor`, `chore`, `docs`, `test`), e.g.
  `feat/product-catalogue`. The pre-commit hook rejects other names and
  runs the tests.
- Open a PR into `develop` and fill in the PR template. Releases are a PR
  from `develop` into `main`.
- Every Convex function ships with tests, including its permission checks.
- Every UI string goes into both `messages/fr.json` and `messages/en.json`.
