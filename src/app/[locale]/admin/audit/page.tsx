import { AuthGate } from "@/components/admin/auth-gate";
import { AuditLogPanel } from "@/components/admin/audit-log-panel";

export default function Page() {
  return (
    <AuthGate>
      <AuditLogPanel />
    </AuthGate>
  );
}
