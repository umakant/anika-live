import { AppShell } from "@/components/AppShell";
import { PlaylistBuilder } from "@/components/PlaylistBuilder";
import { PageHeader } from "@/components/ui";

export default function PlaylistPage() {
  return (
    <AppShell>
      <PageHeader
        title="Playlist Builder"
        description="Select videos, drag to reorder, and generate FFmpeg playlist.txt."
      />
      <PlaylistBuilder />
    </AppShell>
  );
}
