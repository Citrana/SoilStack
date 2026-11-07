import { UsersAdminPanel } from "@/components/admin/users-admin-panel";

// Rendered in the browser behind AuthGate (see the admin layout).
export const instant = false;

export default function Page() {
  return <UsersAdminPanel />;
}
