"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, StatusDot } from "./ui";
import { formatUptime } from "@/lib/format";

interface StreamStatus {
  running: boolean;
  playlistCount: number;
  currentFile: string | null;
  uptimeSeconds: number | null;
  lastError: string | null;
  restartCount: number;
  ffmpegInstalled: boolean;
  playlistExists: boolean;
  system: {
    cpuLoad: number[];
    memoryUsedMb: number;
    memoryTotalMb: number;
    memoryPercent: number;
    ffmpegMemoryMb: number | null;
  };
}

export function StreamControls({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/stream/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function runAction(action: "start" | "stop" | "restart") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/stream/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  if (!status) {
    return <Card>Loading stream status...</Card>;
  }

  return (
    <Card>
      {!compact && <h3 className="mb-4 text-lg font-medium">Live Stream Control</h3>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusDot active={status.running} />
        <span className="font-medium">{status.running ? "Streaming" : "Stopped"}</span>
        {status.running && (
          <span className="text-sm text-slate-400">
            Uptime: {formatUptime(status.uptimeSeconds)}
          </span>
        )}
      </div>

      <div className="mb-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <p>Playlist videos: {status.playlistCount}</p>
        <p>Currently playing: {status.currentFile || "—"}</p>
        <p>Auto-restarts: {status.restartCount}</p>
        <p>
          RAM: {status.system.memoryUsedMb} / {status.system.memoryTotalMb} MB (
          {status.system.memoryPercent}%)
        </p>
        <p>CPU load: {status.system.cpuLoad.map((n) => n.toFixed(2)).join(", ")}</p>
        <p>FFmpeg RAM: {status.system.ffmpegMemoryMb ?? "—"} MB</p>
      </div>

      {!status.ffmpegInstalled && (
        <p className="mb-3 rounded-lg bg-amber-950/50 px-3 py-2 text-sm text-amber-200">
          FFmpeg is not installed or not in PATH.
        </p>
      )}

      {!status.playlistExists && (
        <p className="mb-3 rounded-lg bg-amber-950/50 px-3 py-2 text-sm text-amber-200">
          No playlist.txt found. Save a playlist before starting the stream.
        </p>
      )}

      {status.lastError && (
        <p className="mb-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">
          Last error: {status.lastError}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => runAction("start")}
          disabled={loading !== null || status.running}
        >
          {loading === "start" ? "Starting..." : "Start Live"}
        </Button>
        <Button
          variant="danger"
          onClick={() => runAction("stop")}
          disabled={loading !== null || !status.running}
        >
          {loading === "stop" ? "Stopping..." : "Stop Live"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => runAction("restart")}
          disabled={loading !== null}
        >
          {loading === "restart" ? "Restarting..." : "Restart Stream"}
        </Button>
      </div>
    </Card>
  );
}
