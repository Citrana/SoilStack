import { AuditLogPanel } from "@/components/admin/audit-log-panel";

// Rendered in the browser behind AuthGate (see the admin layout).
export const instant = false;

export default function Page() {
  return <AuditLogPanel />;
}
