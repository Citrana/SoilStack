import { LoginForm } from "@/components/admin/login-form";

// Rendered in the browser behind AuthGate (see the admin layout).
export const instant = false;

export default function Page() {
  return <LoginForm />;
}
