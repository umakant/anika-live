import fs from "fs";
import path from "path";

const root = process.env.LIVE_DATA_ROOT || path.join(process.cwd(), "data", "live");

export const paths = {
  root,
  videos: process.env.VIDEOS_DIR || path.join(root, "videos"),
  processed: process.env.PROCESSED_DIR || path.join(root, "processed"),
  playlistFile: process.env.PLAYLIST_FILE || path.join(root, "playlist.txt"),
  data: process.env.DATA_DIR || path.join(root, "data"),
  videosJson: path.join(
    process.env.DATA_DIR || path.join(root, "data"),
    "videos.json"
  ),
  playlistJson: path.join(
    process.env.DATA_DIR || path.join(root, "data"),
    "playlist.json"
  ),
  settingsJson: path.join(
    process.env.DATA_DIR || path.join(root, "data"),
    "settings.json"
  ),
  streamStateJson: path.join(
    process.env.DATA_DIR || path.join(root, "data"),
    "stream-state.json"
  ),
  streamLogsFile: path.join(
    process.env.DATA_DIR || path.join(root, "data"),
    "stream-logs.txt"
  ),
};

export function ensureDirectories(): void {
  for (const dir of [paths.videos, paths.processed, paths.data]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function toConcatPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
