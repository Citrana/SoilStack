import { v, type Infer } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id, TableNames } from "../_generated/dataModel";

/**
 * The audit log (`auditLogs`) is append-only (CLAUDE.md): rows are only
 * ever inserted - never patched, replaced or deleted. `logAudit` is the one
 * way to write it; authedMutation also blocks any modification of audit
 * rows at runtime (convex/lib/rbac.ts).
 */

export const auditActionValidator = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
  v.literal("publish"),
  v.literal("unpublish"),
);
export type AuditAction = Infer<typeof auditActionValidator>;

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  "create",
  "update",
  "delete",
  "publish",
  "unpublish",
];

/**
 * A JSON snapshot of (part of) a record. Missing values are stored as
 * `null`. Never put secrets (passwords, tokens) in a snapshot.
 */
export type AuditSnapshot = Record<string, unknown>;

export type AuditEntry = {
  action: AuditAction;
  entityTable: TableNames;
  entityId: string;
  before?: AuditSnapshot;
  after?: AuditSnapshot;
};

function normalize(value: unknown): unknown {
  return value === undefined ? null : value;
}

function clean(snapshot: AuditSnapshot): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(snapshot).map(([key, value]) => [key, normalize(value)]),
  );
}

export async function logAudit(
  ctx: MutationCtx,
  entry: AuditEntry & { actorId: Id<"users"> },
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    actorId: entry.actorId,
    action: entry.action,
    entityTable: entry.entityTable,
    entityId: entry.entityId,
    ...(entry.before !== undefined ? { before: clean(entry.before) } : {}),
    ...(entry.after !== undefined ? { after: clean(entry.after) } : {}),
    timestamp: Date.now(),
  });
}

/**
 * A record without its system fields, optionally limited to `fields`. Use
 * for the `after` of a create and the `before` of a delete.
 */
export function snapshot<T extends Record<string, unknown>>(
  doc: T,
  fields?: ReadonlyArray<keyof T & string>,
): AuditSnapshot {
  const keys = fields ?? Object.keys(doc).filter((k) => !k.startsWith("_"));
  return Object.fromEntries(keys.map((key) => [key, normalize(doc[key])]));
}

/**
 * Only the fields that changed between two snapshots, for an update's
 * before/after. Returns `null` when nothing changed - skip the entry then.
 */
export function diff(
  before: AuditSnapshot,
  after: AuditSnapshot,
): { before: AuditSnapshot; after: AuditSnapshot } | null {
  const changedBefore: AuditSnapshot = {};
  const changedAfter: AuditSnapshot = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = normalize(before[key]);
    const a = normalize(after[key]);
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changedBefore[key] = b;
      changedAfter[key] = a;
    }
  }
  if (Object.keys(changedAfter).length === 0) return null;
  return { before: changedBefore, after: changedAfter };
}
