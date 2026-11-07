import { AuthGate } from "@/components/admin/auth-gate";
import { AccountPanel } from "@/components/admin/account-panel";

export default function Page() {
  return (
    <AuthGate>
      <AccountPanel />
    </AuthGate>
  );
}
