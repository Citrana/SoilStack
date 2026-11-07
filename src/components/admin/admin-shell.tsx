"use client";

import { useState, type ReactNode } from "react";
import {
  ExternalLink,
  History,
  ImageIcon,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { MEDIA_BROWSE_PERMISSIONS } from "../../../convex/lib/media";
import type { PermissionKey } from "../../../convex/lib/permissions";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/components/admin/logout-button";
import { useRoleText } from "@/components/admin/use-role-text";
import { useMyPermissions } from "@/lib/use-can";
import { cn } from "@/lib/utils";

type CurrentUser = NonNullable<FunctionReturnType<typeof api.users.getCurrentUser>>;

type NavItem = {
  href: "/admin" | "/admin/media" | "/admin/users" | "/admin/roles" | "/admin/audit";
  key: "dashboard" | "media" | "users" | "roles" | "audit";
  icon: LucideIcon;
  /** Shown only to holders of any of these (UI only - see CLAUDE.md). */
  anyOf?: readonly PermissionKey[];
};

/** Admin sections. Later features (pages, blog, products…) add theirs here. */
export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/media", key: "media", icon: ImageIcon, anyOf: MEDIA_BROWSE_PERMISSIONS },
  { href: "/admin/users", key: "users", icon: Users, anyOf: ["users.manage"] },
  { href: "/admin/roles", key: "roles", icon: ShieldCheck, anyOf: ["roles.manage"] },
  { href: "/admin/audit", key: "audit", icon: History, anyOf: ["audit.view"] },
];

export function useVisibleNav() {
  const permissions = useMyPermissions();
  return ADMIN_NAV.filter(
    (item) => !item.anyOf || item.anyOf.some((key) => permissions?.has(key)),
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  const items = useVisibleNav();
  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav aria-label={t("label")} className="flex flex-1 flex-col gap-1">
      {items.map(({ href, key, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={linkClass(active)}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col gap-1 border-t pt-3">
        <Link
          href="/admin/account"
          onClick={onNavigate}
          aria-current={pathname === "/admin/account" ? "page" : undefined}
          className={linkClass(pathname === "/admin/account")}
        >
          <UserRound className="size-4" aria-hidden />
          {t("account")}
        </Link>
        <Link href="/" target="_blank" className={linkClass(false)}>
          <ExternalLink className="size-4" aria-hidden />
          {t("viewSite")}
        </Link>
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2 font-semibold text-forest">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-forest text-sm font-bold text-white"
      >
        S
      </span>
      SoilStack
    </Link>
  );
}

/** Mobile-first admin layout: top bar + sheet menu on phones, sidebar from md. */
export function AdminShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  const t = useTranslations("Admin.nav");
  const roleText = useRoleText();
  const [menuOpen, setMenuOpen] = useState(false);
  const roleName = user.roleName ? roleText({ name: user.roleName }).name : null;

  const userBlock = (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{user.name || user.email}</p>
      {roleName ? (
        <p className="truncate text-xs text-muted-foreground">{roleName}</p>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-card p-4 md:flex">
        <Brand />
        <NavLinks />
        <div className="flex flex-col gap-3 border-t pt-3">
          {userBlock}
          <div className="flex items-center justify-between gap-2">
            <LocaleSwitcher />
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-card/95 px-4 backdrop-blur md:hidden">
          <Brand />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("openMenu")}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
        </header>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="p-0">
              <SheetTitle>
                <Brand />
              </SheetTitle>
            </SheetHeader>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <div className="flex flex-col gap-3 border-t pt-3">
              {userBlock}
              <div className="flex items-center justify-between gap-2">
                <LocaleSwitcher />
                <LogoutButton />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
