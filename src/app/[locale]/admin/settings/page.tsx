import { AuthGate } from "@/components/admin/auth-gate";
import { SettingsPanel } from "@/components/admin/settings-panel";

export default function Page() {
  return (
    <AuthGate>
      <SettingsPanel />
    </AuthGate>
  );
}
