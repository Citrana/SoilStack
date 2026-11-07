import { AuthGate } from "@/components/admin/auth-gate";
import { PagesAdminPanel } from "@/components/admin/pages/pages-admin-panel";

export default function Page() {
  return (
    <AuthGate>
      <PagesAdminPanel />
    </AuthGate>
  );
}
