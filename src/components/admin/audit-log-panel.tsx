"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { useQuery, type PaginatedQueryItem } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { AuditAction } from "../../../convex/lib/audit";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/features";
import { useCursorPaginatedQuery } from "@/components/data-table/use-cursor-paginated-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useCan } from "@/lib/use-can";

type AuditEntry = PaginatedQueryItem<typeof api.auditLogs.list>;

/** Record types that write audit entries. Later features add theirs. */
const ENTITY_TABLES = ["users", "roles", "rolePermissions"] as const;
type EntityTable = (typeof ENTITY_TABLES)[number];

function isEntityTable(table: string): table is EntityTable {
  return (ENTITY_TABLES as readonly string[]).includes(table);
}

const ACTION_VARIANTS: Record<AuditAction, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  publish: "default",
  unpublish: "outline",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  // Localized text: "FR / EN".
  if (typeof value === "object" && "fr" in value && "en" in value) {
    const loc = value as { fr: unknown; en: unknown };
    return `${formatValue(loc.fr)} / ${formatValue(loc.en)}`;
  }
  return JSON.stringify(value);
}

/** Field-by-field before/after of one entry. */
function ChangesTable({ entry }: { entry: AuditEntry }) {
  const t = useTranslations("AuditLog");
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (fields.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="p-2 font-medium">{t("field")}</th>
            {entry.before ? <th className="p-2 font-medium">{t("before")}</th> : null}
            {entry.after ? <th className="p-2 font-medium">{t("after")}</th> : null}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field} className="border-t align-top">
              <td className="p-2 font-mono text-xs text-muted-foreground">{field}</td>
              {entry.before ? <td className="p-2 break-all">{formatValue(before[field])}</td> : null}
              {entry.after ? <td className="p-2 break-all">{formatValue(after[field])}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Read-only view of the append-only audit log. There are deliberately no
 * edit or delete controls - the server exposes no such functions either.
 */
export function AuditLogPanel() {
  const t = useTranslations("AuditLog");
  const locale = useLocale();
  const canView = useCan("audit.view");
  const [actorId, setActorId] = useState<Id<"users"> | "">("");
  const [entityTable, setEntityTable] = useState<EntityTable | "">("");
  const [entityId, setEntityId] = useState("");
  const actors = useQuery(api.auditLogs.listActors, canView ? {} : "skip");

  const args = {
    ...(actorId ? { actorId } : {}),
    ...(entityTable ? { entityTable } : {}),
    ...(entityId ? { entityId } : {}),
  };
  const { results, pagination } = useCursorPaginatedQuery(
    api.auditLogs.list,
    canView ? args : "skip",
    { initialPageSize: 20 },
  );

  if (canView === undefined) return null;
  if (!canView) return <AccessDenied message={t("accessDenied")} />;

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  const entityLabel = (table: string) => (isEntityTable(table) ? t(`entities.${table}`) : table);
  const actorLabel = (entry: AuditEntry) => entry.actorName || entry.actorEmail || t("unknownActor");
  const subject = (entry: AuditEntry) => {
    const snapshot = { ...entry.before, ...entry.after } as Record<string, unknown>;
    const label = snapshot.email ?? snapshot.role ?? snapshot.permission;
    return label ? formatValue(label) : "";
  };
  const actionBadge = (entry: AuditEntry) => (
    <Badge variant={ACTION_VARIANTS[entry.action]}>{t(`actions.${entry.action}`)}</Badge>
  );
  const time = (entry: AuditEntry) => (
    <time dateTime={new Date(entry.timestamp).toISOString()}>{dateFormat.format(entry.timestamp)}</time>
  );

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      id: "time",
      header: t("timeHeader"),
      cell: ({ row }) => time(row.original),
      meta: { className: "whitespace-nowrap text-muted-foreground" },
    },
    { id: "who", header: t("whoHeader"), cell: ({ row }) => actorLabel(row.original), meta: { hideBelow: "md" } },
    { id: "action", header: t("actionHeader"), cell: ({ row }) => actionBadge(row.original) },
    {
      id: "record",
      header: t("recordHeader"),
      cell: ({ row }) => (
        <span>
          {entityLabel(row.original.entityTable)}{" "}
          <span className="text-muted-foreground">{subject(row.original)}</span>
        </span>
      ),
    },
  ];

  const details = (entry: AuditEntry) => (
    <div className="flex flex-col gap-3 pt-1 text-sm">
      <p className="text-muted-foreground">
        {actorLabel(entry)} · {time(entry)} ·{" "}
        <span className="font-mono text-xs break-all">{entry.entityId}</span>
      </p>
      <ChangesTable entry={entry} />
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          setActorId("");
          setEntityTable(isEntityTable(entry.entityTable) ? entry.entityTable : "");
          setEntityId(entry.entityId);
        }}
      >
        <History aria-hidden />
        {t("recordHistory")}
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <DataTable
        columns={columns}
        data={results}
        getRowId={(entry) => entry._id}
        emptyMessage={t("empty")}
        pagination={{ mode: "server", ...pagination }}
        renderExpanded={details}
        renderCard={(entry) => (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {actionBadge(entry)}
              <span className="font-medium">{entityLabel(entry.entityTable)}</span>
            </div>
            <p className="text-sm break-all">{subject(entry)}</p>
            <p className="text-xs text-muted-foreground">
              {time(entry)} · {actorLabel(entry)}
            </p>
          </div>
        )}
        toolbar={
          <div className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audit-actor">{t("actorLabel")}</Label>
              <NativeSelect
                id="audit-actor"
                value={actorId}
                onChange={(e) => setActorId(e.target.value as Id<"users"> | "")}
              >
                <option value="">{t("allActors")}</option>
                {actors?.map((actor) => (
                  <option key={actor._id} value={actor._id}>
                    {actor.name || actor.email}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audit-entity">{t("entityLabel")}</Label>
              <NativeSelect
                id="audit-entity"
                value={entityTable}
                onChange={(e) => {
                  setEntityTable(e.target.value as EntityTable | "");
                  setEntityId("");
                }}
              >
                <option value="">{t("allEntities")}</option>
                {ENTITY_TABLES.map((table) => (
                  <option key={table} value={table}>
                    {t(`entities.${table}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {actorId || entityTable || entityId ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setActorId("");
                  setEntityTable("");
                  setEntityId("");
                }}
              >
                {t("clearFilters")}
              </Button>
            ) : null}
          </div>
        }
      />
    </>
  );
}
