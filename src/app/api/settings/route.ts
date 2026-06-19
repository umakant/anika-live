import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/storage";
import type { StreamSettings } from "@/lib/types";

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({
    settings: {
      ...settings,
      streamKey: settings.streamKey ? "********" : "",
      hasStreamKey: Boolean(settings.streamKey),
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<StreamSettings>;
    const current = getSettings();

    const next: StreamSettings = {
      rtmpUrl: body.rtmpUrl?.trim() || current.rtmpUrl,
      streamKey:
        body.streamKey && body.streamKey !== "********"
          ? body.streamKey.trim()
          : current.streamKey,
      bitrate: body.bitrate?.trim() || current.bitrate,
      resolution: body.resolution?.trim() || current.resolution,
      fps: body.fps ? Number(body.fps) : current.fps,
      audioBitrate: body.audioBitrate?.trim() || current.audioBitrate,
    };

    saveSettings(next);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
