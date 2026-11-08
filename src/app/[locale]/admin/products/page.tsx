import { AuthGate } from "@/components/admin/auth-gate";
import { ProductsAdminPanel } from "@/components/admin/products/products-admin-panel";

export default function Page() {
  return (
    <AuthGate>
      <ProductsAdminPanel />
    </AuthGate>
  );
}
