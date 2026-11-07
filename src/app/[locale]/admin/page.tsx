import { AuthGate } from "@/components/admin/auth-gate";
import { DashboardPanel } from "@/components/admin/dashboard-panel";

export default function Page() {
  return (
    <AuthGate>
      <DashboardPanel />
    </AuthGate>
  );
}
