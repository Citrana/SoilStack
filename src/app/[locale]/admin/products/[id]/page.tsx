import { AuthGate } from "@/components/admin/auth-gate";
import { ProductEditorRoute } from "@/components/admin/products/product-editor";

export default function Page() {
  return (
    <AuthGate>
      <ProductEditorRoute />
    </AuthGate>
  );
}
