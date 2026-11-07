import { AuthGate } from "@/components/admin/auth-gate";
import { BlogAdminPanel } from "@/components/admin/blog/blog-admin-panel";

export default function Page() {
  return (
    <AuthGate>
      <BlogAdminPanel />
    </AuthGate>
  );
}
