import { NextRequest, NextResponse } from "next/server";
import path from "path";
import {
  savePlaylist,
  getVideos,
  saveVideos,
} from "@/lib/storage";
import { normalizeVideoRecord, writePlaylistFile, formatFfmpegError } from "@/lib/ffmpeg";
import { paths } from "@/lib/paths";

export const maxDuration = 600;

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { videoIds?: string[] };
    if (!Array.isArray(body.videoIds)) {
      return NextResponse.json({ error: "videoIds array required" }, { status: 400 });
    }

    const allVideos = getVideos();
    const videoMap = new Map(allVideos.map((v) => [v.id, v]));
    const selected = body.videoIds.filter((id) => videoMap.has(id));

    if (selected.length === 0) {
      return NextResponse.json({ error: "Select at least one video" }, { status: 400 });
    }

    const normalizedPaths: string[] = [];
    const updatedVideos = [...allVideos];

    for (const id of selected) {
      const index = updatedVideos.findIndex((v) => v.id === id);
      if (index === -1) continue;

      const normalized = await normalizeVideoRecord(updatedVideos[index]);
      updatedVideos[index] = normalized;
      normalizedPaths.push(
        path.join(paths.processed, normalized.normalizedFilename || `${id}.mp4`)
      );
    }

    saveVideos(updatedVideos);
    writePlaylistFile(normalizedPaths);

    const playlist = {
      videoIds: selected,
      updatedAt: new Date().toISOString(),
    };
    savePlaylist(playlist);

    return NextResponse.json({
      playlist,
      playlistFile: paths.playlistFile,
      normalizedCount: normalizedPaths.length,
    });
  } catch (err) {
    const message = formatFfmpegError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
