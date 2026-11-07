import { AuthGate } from "@/components/admin/auth-gate";
import { MediaLibraryPanel } from "@/components/admin/media-library-panel";

export default function Page() {
  return (
    <AuthGate>
      <MediaLibraryPanel />
    </AuthGate>
  );
}
