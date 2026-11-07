import { DashboardPanel } from "@/components/admin/dashboard-panel";

// Rendered in the browser behind AuthGate (see the admin layout).
export const instant = false;

export default function Page() {
  return <DashboardPanel />;
}
