import { AuthGate } from "@/components/admin/auth-gate";
import { ProjectEditorRoute } from "@/components/admin/projects/project-editor";

export default function Page() {
  return (
    <AuthGate>
      <ProjectEditorRoute />
    </AuthGate>
  );
}
