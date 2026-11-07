import { RoleEditorRoute } from "@/components/admin/role-editor";

// Rendered in the browser behind AuthGate (see the admin layout).
export const instant = false;

export default function Page() {
  return <RoleEditorRoute />;
}
