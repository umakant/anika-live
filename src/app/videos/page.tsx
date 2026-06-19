import { AppShell } from "@/components/AppShell";
import { VideoManager } from "@/components/VideoManager";
import { PageHeader } from "@/components/ui";

export default function VideosPage() {
  return (
    <AppShell>
      <PageHeader
        title="Upload Videos"
        description="Upload MP4 files stored on your server for playlist streaming."
      />
      <VideoManager />
    </AppShell>
  );
}
