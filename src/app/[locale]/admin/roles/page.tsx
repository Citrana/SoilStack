import { AuthGate } from "@/components/admin/auth-gate";
import { RolesAdminPanel } from "@/components/admin/roles-admin-panel";

export default function Page() {
  return (
    <AuthGate>
      <RolesAdminPanel />
    </AuthGate>
  );
}
