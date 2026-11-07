import { AuthGate } from "@/components/admin/auth-gate";
import { UsersAdminPanel } from "@/components/admin/users-admin-panel";

export default function Page() {
  return (
    <AuthGate>
      <UsersAdminPanel />
    </AuthGate>
  );
}
