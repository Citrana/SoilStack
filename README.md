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

Then, in a second terminal, run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to
`/fr` (or `/en` for an English browser).

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
