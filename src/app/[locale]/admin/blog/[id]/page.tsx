import { AuthGate } from "@/components/admin/auth-gate";
import { PostEditorRoute } from "@/components/admin/blog/post-editor";

export default function Page() {
  return (
    <AuthGate>
      <PostEditorRoute />
    </AuthGate>
  );
}
