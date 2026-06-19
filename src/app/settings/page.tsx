import { AppShell } from "@/components/AppShell";
import { SettingsForm } from "@/components/SettingsForm";
import { PageHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Stream Settings"
        description="Configure YouTube RTMP URL, stream key, and encoding options."
      />
      <SettingsForm />
    </AppShell>
  );
}
