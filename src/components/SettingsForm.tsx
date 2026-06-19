"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "./ui";
import type { StreamSettings } from "@/lib/types";

export function SettingsForm() {
  const [settings, setSettings] = useState<StreamSettings>({
    rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
    streamKey: "",
    bitrate: "3000k",
    resolution: "1080x1920",
    fps: 30,
    audioBitrate: "128k",
  });
  const [hasStreamKey, setHasStreamKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          rtmpUrl: data.settings.rtmpUrl,
          streamKey: "",
          bitrate: data.settings.bitrate,
          resolution: data.settings.resolution,
          fps: data.settings.fps,
          audioBitrate: data.settings.audioBitrate,
        });
        setHasStreamKey(data.settings.hasStreamKey);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setHasStreamKey(Boolean(settings.streamKey) || hasStreamKey);
      setMessage("Settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">YouTube RTMP URL</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={settings.rtmpUrl}
            onChange={(e) => setSettings({ ...settings, rtmpUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">YouTube Stream Key</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder={hasStreamKey ? "Saved (enter to replace)" : "Paste from YouTube Studio"}
            value={settings.streamKey}
            onChange={(e) => setSettings({ ...settings, streamKey: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Video Bitrate</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={settings.bitrate}
              onChange={(e) => setSettings({ ...settings, bitrate: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Resolution</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={settings.resolution}
              onChange={(e) => setSettings({ ...settings, resolution: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">FPS</label>
            <input
              type="number"
              min={1}
              max={60}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={settings.fps}
              onChange={(e) => setSettings({ ...settings, fps: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Audio Bitrate</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={settings.audioBitrate}
              onChange={(e) => setSettings({ ...settings, audioBitrate: e.target.value })}
            />
          </div>
        </div>

        {message && <p className="text-sm text-slate-300">{message}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Card>
  );
}
