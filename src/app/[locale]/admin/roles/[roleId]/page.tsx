import { AuthGate } from "@/components/admin/auth-gate";
import { RoleEditorRoute } from "@/components/admin/role-editor";

export default function Page() {
  return (
    <AuthGate>
      <RoleEditorRoute />
    </AuthGate>
  );
}
