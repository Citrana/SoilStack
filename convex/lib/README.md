# convex/lib

Shared server-side helpers, not routable Convex functions themselves.
Each helper is documented here as it is added.

- `test-setup.ts` — Vitest `setupFiles` entry providing a test-only JWT
  keypair so `@convex-dev/auth` can sign session tokens inside
  `convex-test`'s mock backend. Not used against any real deployment.
