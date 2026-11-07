"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { PermissionKey } from "../../convex/lib/permissions";

/**
 * The signed-in user's permission keys, or `undefined` while loading.
 * Convex dedupes the subscription, so every hook below shares one query.
 * Reactive: a role change on the server updates it live.
 */
export function useMyPermissions(): ReadonlySet<string> | undefined {
  const keys = useQuery(api.rbac.getMyPermissions);
  return keys === undefined ? undefined : new Set(keys);
}

/**
 * Whether the signed-in user holds `permissionKey`, via their role.
 * `undefined` while loading. For hiding UI only: the server is always the
 * authority (every Convex function checks via requirePermission).
 */
export function useCan(permissionKey: PermissionKey): boolean | undefined {
  const permissions = useMyPermissions();
  return permissions === undefined ? undefined : permissions.has(permissionKey);
}
