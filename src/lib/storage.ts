import fs from "fs";
import { paths, ensureDirectories } from "./paths";
import type { VideoRecord, PlaylistData, StreamSettings, StreamState, PlaylistSaveProgress } from "./types";
import { DEFAULT_SETTINGS } from "./types";

function readJson<T>(filePath: string, fallback: T): T {
  ensureDirectories();
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDirectories();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function getVideos(): VideoRecord[] {
  return readJson<VideoRecord[]>(paths.videosJson, []);
}

export function saveVideos(videos: VideoRecord[]): void {
  writeJson(paths.videosJson, videos);
}

export function getVideoById(id: string): VideoRecord | undefined {
  return getVideos().find((v) => v.id === id);
}

export function addVideo(video: VideoRecord): void {
  const videos = getVideos();
  videos.push(video);
  saveVideos(videos);
}

export function removeVideo(id: string): VideoRecord | undefined {
  const videos = getVideos();
  const index = videos.findIndex((v) => v.id === id);
  if (index === -1) return undefined;
  const [removed] = videos.splice(index, 1);
  saveVideos(videos);
  return removed;
}

export function getPlaylist(): PlaylistData {
  return readJson<PlaylistData>(paths.playlistJson, {
    videoIds: [],
    updatedAt: new Date(0).toISOString(),
  });
}

export function savePlaylist(data: PlaylistData): void {
  writeJson(paths.playlistJson, data);
}

export function getSettings(): StreamSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<StreamSettings>>(paths.settingsJson, {}) };
}

export function saveSettings(settings: StreamSettings): void {
  writeJson(paths.settingsJson, settings);
}

export function getStreamState(): StreamState {
  return readJson<StreamState>(paths.streamStateJson, {
    running: false,
    pid: null,
    startedAt: null,
    currentFile: null,
    lastError: null,
    restartCount: 0,
    managedByApp: false,
  });
}

export function saveStreamState(state: StreamState): void {
  writeJson(paths.streamStateJson, state);
}

export function appendStreamLog(line: string): void {
  ensureDirectories();
  fs.appendFileSync(paths.streamLogsFile, `${line}\n`, "utf8");
}

export function getStreamLogs(maxLines = 200): string[] {
  ensureDirectories();
  if (!fs.existsSync(paths.streamLogsFile)) return [];
  const content = fs.readFileSync(paths.streamLogsFile, "utf8");
  const lines = content.split("\n").filter(Boolean);
  return lines.slice(-maxLines);
}

export function clearStreamLogs(): void {
  ensureDirectories();
  fs.writeFileSync(paths.streamLogsFile, "", "utf8");
}

export function getPlaylistSaveProgress(): PlaylistSaveProgress {
  return readJson<PlaylistSaveProgress>(paths.playlistSaveProgressJson, {
    active: false,
    current: 0,
    total: 0,
    step: "idle",
    videoName: "",
    updatedAt: new Date(0).toISOString(),
  });
}

export function savePlaylistSaveProgress(progress: PlaylistSaveProgress): void {
  writeJson(paths.playlistSaveProgressJson, progress);
}
