export interface VideoRecord {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  duration: number;
  uploadedAt: string;
  normalizedFilename?: string;
  storage?: "cloudinary" | "local";
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
}

export interface PlaylistData {
  videoIds: string[];
  updatedAt: string;
}

export interface StreamSettings {
  rtmpUrl: string;
  streamKey: string;
  bitrate: string;
  resolution: string;
  fps: number;
  audioBitrate: string;
}

export interface StreamState {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  currentFile: string | null;
  lastError: string | null;
  restartCount: number;
  managedByApp: boolean;
}

export interface PlaylistSaveProgress {
  active: boolean;
  current: number;
  total: number;
  step: "download" | "normalize" | "write" | "done" | "idle";
  videoName: string;
  updatedAt: string;
}

export interface SystemStats {
  cpuLoad: number[];
  memoryUsedMb: number;
  memoryTotalMb: number;
  memoryPercent: number;
  ffmpegMemoryMb: number | null;
}

export const DEFAULT_SETTINGS: StreamSettings = {
  rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
  streamKey: "",
  bitrate: "3000k",
  resolution: "1080x1920",
  fps: 30,
  audioBitrate: "128k",
};
