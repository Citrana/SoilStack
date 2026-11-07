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

/** Who is signed in, shared by AdminFrame and AuthGate (one Convex subscription). */
function useAdminSession() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  return { isLoading, isAuthenticated, currentUser };
}

/**
 * Layout-level frame: adds the admin shell (menu, account) once a user is
 * signed in and has a real password. It ALWAYS renders `children` - the
 * page segment - so Next.js streams it on every request; deciding what the
 * page shows is AuthGate's job, inside each page.
 */
export function AdminFrame({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUser } = useAdminSession();
  const pathname = usePathname();
  const showShell =
    isAuthenticated &&
    currentUser != null &&
    !currentUser.mustChangePassword &&
    pathname !== LOGIN_PATH;
  return showShell ? <AdminShell user={currentUser}>{children}</AdminShell> : <>{children}</>;
}

/**
 * Page-level protection for /admin (CLAUDE.md, "Authentication"): signed
 * out -> login page; temporary password -> forced change; otherwise the
 * page content. The login page uses it too (signed in -> dashboard). The
 * real boundary is server-side (convex/lib/rbac.ts).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, currentUser } = useAdminSession();
  const { signOut } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === LOGIN_PATH;

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
  return <>{children}</>;
}
