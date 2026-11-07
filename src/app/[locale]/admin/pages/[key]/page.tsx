import { AuthGate } from "@/components/admin/auth-gate";
import { PageEditorRoute } from "@/components/admin/pages/page-editor";

export default function Page() {
  return (
    <AuthGate>
      <PageEditorRoute />
    </AuthGate>
  );
}
