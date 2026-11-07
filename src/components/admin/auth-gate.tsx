"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ChangePasswordScreen } from "@/components/admin/change-password-screen";

const LOGIN_PATH = "/admin/login";

export function FullScreenSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}

/**
 * Client-side protection for /admin (CLAUDE.md, "Authentication"): signed
 * out -> login page; temporary password -> forced change; otherwise the
 * admin shell. The real boundary is server-side (convex/lib/rbac.ts).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === LOGIN_PATH;

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  // A session can outlive the user being blocked; getCurrentUser then
  // returns null although isAuthenticated is still true. Sign out so the
  // normal redirect below takes over.
  const isBlockedSession = isAuthenticated && currentUser === null;

  useEffect(() => {
    if (isBlockedSession) void signOut();
  }, [isBlockedSession, signOut]);

  useEffect(() => {
    if (isLoading || isBlockedSession) return;
    if (!isAuthenticated && !isLoginPage) router.replace(LOGIN_PATH);
    if (isAuthenticated && isLoginPage) router.replace("/admin");
  }, [isLoading, isAuthenticated, isLoginPage, isBlockedSession, router]);

  if (isLoading || isBlockedSession) return <FullScreenSpinner />;
  if (!isAuthenticated) return isLoginPage ? <>{children}</> : null;
  if (isLoginPage) return null; // redirecting
  if (currentUser === undefined || currentUser === null) return <FullScreenSpinner />;
  if (currentUser.mustChangePassword) return <ChangePasswordScreen />;

  return <AdminShell user={currentUser}>{children}</AdminShell>;
}
