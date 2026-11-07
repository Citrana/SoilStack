import { AuthGate } from "@/components/admin/auth-gate";
import { LoginForm } from "@/components/admin/login-form";

export default function Page() {
  return (
    <AuthGate>
      <LoginForm />
    </AuthGate>
  );
}
