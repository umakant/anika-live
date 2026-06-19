import { NextResponse } from "next/server";
import fs from "fs";
import { getStreamManager } from "@/lib/stream-manager";
import { getPlaylist, getStreamLogs } from "@/lib/storage";
import { checkFfmpegInstalled } from "@/lib/ffmpeg";
import { paths } from "@/lib/paths";

export async function GET() {
  const manager = getStreamManager();
  const status = manager.getStatus();
  const stats = manager.getSystemStats();
  const playlist = getPlaylist();
  const ffmpegInstalled = await checkFfmpegInstalled();
  const playlistExists = fs.existsSync(paths.playlistFile);

  return NextResponse.json({
    ...status,
    playlistCount: playlist.videoIds.length,
    ffmpegInstalled,
    playlistExists,
    playlistFile: paths.playlistFile,
    logs: getStreamLogs(200),
    system: stats,
  });
}
