import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  savePlaylist,
  getVideos,
  saveVideos,
  savePlaylistSaveProgress,
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

    savePlaylistSaveProgress({
      active: true,
      current: 0,
      total: selected.length,
      step: "download",
      videoName: "",
      updatedAt: new Date().toISOString(),
    });

    for (let i = 0; i < selected.length; i++) {
      const id = selected[i];
      const index = updatedVideos.findIndex((v) => v.id === id);
      if (index === -1) continue;

      const video = updatedVideos[index];
      const processedPath = path.join(paths.processed, `${video.id}.mp4`);
      const needsNormalize = !fs.existsSync(processedPath);

      savePlaylistSaveProgress({
        active: true,
        current: i + 1,
        total: selected.length,
        step: needsNormalize ? "normalize" : "download",
        videoName: video.originalName,
        updatedAt: new Date().toISOString(),
      });

      const normalized = await normalizeVideoRecord(video);
      updatedVideos[index] = normalized;
      normalizedPaths.push(
        path.join(paths.processed, normalized.normalizedFilename || `${id}.mp4`)
      );
    }

    savePlaylistSaveProgress({
      active: true,
      current: selected.length,
      total: selected.length,
      step: "write",
      videoName: "",
      updatedAt: new Date().toISOString(),
    });

    saveVideos(updatedVideos);
    writePlaylistFile(normalizedPaths);

    const playlist = {
      videoIds: selected,
      updatedAt: new Date().toISOString(),
    };
    savePlaylist(playlist);

    savePlaylistSaveProgress({
      active: false,
      current: selected.length,
      total: selected.length,
      step: "done",
      videoName: "",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      playlist,
      playlistFile: paths.playlistFile,
      normalizedCount: normalizedPaths.length,
    });
  } catch (err) {
    savePlaylistSaveProgress({
      active: false,
      current: 0,
      total: 0,
      step: "idle",
      videoName: "",
      updatedAt: new Date().toISOString(),
    });
    const message = formatFfmpegError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
