import { AuthGate } from "@/components/admin/auth-gate";
import { ProjectsAdminPanel } from "@/components/admin/projects/projects-admin-panel";

export default function Page() {
  return (
    <AuthGate>
      <ProjectsAdminPanel />
    </AuthGate>
  );
}
