import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { appError } from "./lib/errors";

const password = Password({
  // Accounts are only ever created by an admin (users.createUser) or the
  // seed (seed.seedSuperAdmin) - never through this provider's own
  // "signUp" flow. `profile()` runs for every flow but its return value is
  // only used (for its `email`) outside "signUp"; the extra fields are
  // placeholders required by the users table's type.
  profile(params) {
    if (params.flow === "signUp") {
      throw appError(
        "FORBIDDEN",
        "Public sign-up is disabled. Ask an administrator to create your account.",
      );
    }
    return {
      email: String(params.email).trim().toLowerCase(),
      name: "",
      roleId: null,
      status: "active",
      mustChangePassword: false,
      createdBy: null,
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password],
  callbacks: {
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user || user.status === "blocked") {
        throw appError("FORBIDDEN", "This account cannot sign in.");
      }
      await ctx.db.patch(userId, { lastLoginAt: Date.now() });
    },
  },
});
