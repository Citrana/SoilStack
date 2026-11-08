import { AuthGate } from "@/components/admin/auth-gate";
import { CategoriesPanel } from "@/components/admin/products/categories-panel";

export default function Page() {
  return (
    <AuthGate>
      <CategoriesPanel />
    </AuthGate>
  );
}
