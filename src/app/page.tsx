import { AppShell } from "@/components/AppShell";
import { StreamControls } from "@/components/StreamControls";
import { LogsViewer } from "@/components/LogsViewer";
import { PageHeader, Card } from "@/components/ui";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Monitor stream status, control playback, and review logs."
      />

      <div className="space-y-6">
        <StreamControls />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/videos", label: "Upload Videos", desc: "Add MP4 Shorts" },
            { href: "/playlist", label: "Playlist", desc: "Order & normalize" },
            { href: "/settings", label: "Stream Settings", desc: "RTMP & quality" },
            { href: "/logs", label: "Full Logs", desc: "FFmpeg output" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="transition hover:border-rose-500/40 hover:bg-slate-900">
                <h3 className="font-medium">{item.label}</h3>
                <p className="mt-1 text-sm text-slate-400">{item.desc}</p>
              </Card>
            </Link>
          ))}
        </div>

        <LogsViewer />
      </div>
    </AppShell>
  );
}
