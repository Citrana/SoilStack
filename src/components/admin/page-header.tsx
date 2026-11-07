import type { ReactNode } from "react";

/** Title row of an admin page, with optional actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

/** Shown when the user lacks the permission (the server refuses anyway). */
export function AccessDenied({ message }: { message: string }) {
  return (
    <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
