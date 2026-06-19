import { AppShell } from "@/components/AppShell";
import { LogsViewer } from "@/components/LogsViewer";
import { StreamControls } from "@/components/StreamControls";
import { PageHeader } from "@/components/ui";

export default function LogsPage() {
  return (
    <AppShell>
      <PageHeader title="Logs & Control" description="Stream controls and FFmpeg log output." />
      <div className="space-y-6">
        <StreamControls compact />
        <LogsViewer />
      </div>
    </AppShell>
  );
}
