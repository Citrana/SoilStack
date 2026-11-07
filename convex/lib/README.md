# convex/lib

Shared server-side helpers, not routable Convex functions themselves.

- `rbac.ts` — **the wrappers every admin function must use**:
  `authedQuery` / `authedMutation` / `authedAction` (convex-helpers custom
  functions). They reject unauthenticated/blocked callers and add
  `ctx.user`, `ctx.permissions` (a Set), `ctx.isSuperAdmin`, `ctx.can(key)`
  and `ctx.requirePermission(key)` / `ctx.requireAnyPermission(keys)`. `authedMutation` also adds
  `ctx.audit(entry)` and a `ctx.db` that refuses to modify append-only
  tables (`APPEND_ONLY_RULES`). Permissions are resolved User -> Role ->
  Permissions fresh on every call; the Super Admin always holds every key.
- `permissions.ts` — the typed permission catalog (`PERMISSIONS`,
  `PermissionKey`, `PERMISSION_MODULES`), `SUPER_ADMIN_ROLE`, and
  `SEED_STEPS` (one-shot role changes: starter roles, later grants).
- `auth.ts` — `getCurrentUserOrNull` / `requireCurrentUser` and
  `requireCurrentUserFromAction` (actions have no `ctx.db`). Use directly
  only for functions that need no permission (e.g. `users.changePassword`).
- `audit.ts` — `logAudit` (the only writer of the append-only `auditLogs`
  table; inside `authedMutation` use `ctx.audit`), `snapshot` / `diff`,
  `auditActionValidator`.
- `errors.ts` — `appError(code, message)` and the `ERROR_CODES` the admin
  translates (`Errors.<code>` in messages/*.json).
- `media.ts` — the image library rules: `MEDIA_LIMITS`,
  `MEDIA_BROWSE_PERMISSIONS`, `setMediaUsages` / `clearMediaUsages` (the
  usage registry every image-storing feature writes), `mediaUsedBy`, and
  `publicImage` (what public queries return for an image).
- `i18n.ts` — `locValidator` (`{ fr, en }`), `pickLoc`, `trimLoc`.
- `password.ts` — `generateStrongPassword` (admin-created accounts and
  resets) and `MIN_PASSWORD_LENGTH` (shared with the UI).
- `test.utils.ts` — test-only helpers (`setupTest`, `insertUserWithRole`,
  `insertRole`, `getRoleId`, `asUser`, `signIn`, `userByEmail`). The double
  dot is deliberate: the Convex CLI skips multi-dot files, so it is never
  pushed.
- `test-setup.ts` — Vitest `setupFiles` entry providing a test-only JWT
  keypair so `@convex-dev/auth` can sign session tokens inside
  `convex-test`'s mock backend. Not used against any real deployment.
