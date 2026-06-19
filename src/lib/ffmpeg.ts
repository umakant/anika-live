import { spawn, execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { downloadCloudinaryVideo } from "./cloudinary";
import { paths, ensureDirectories, toConcatPath } from "./paths";
import type { StreamSettings, VideoRecord } from "./types";

const execFileAsync = promisify(execFile);

export function getFfmpegPath(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export function getFfprobePath(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}

export async function probeDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(getFfprobePath(), [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const duration = parseFloat(stdout.trim());
    return Number.isFinite(duration) ? duration : 0;
  } catch {
    return 0;
  }
}

export async function normalizeVideo(
  inputPath: string,
  outputPath: string,
  onProgress?: (line: string) => void
): Promise<void> {
  ensureDirectories();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const args = [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",
    outputPath,
  ];

  await runFfmpeg(args, onProgress);
}

function runFfmpeg(args: string[], onProgress?: (line: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfmpegPath(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      const line = chunk.toString();
      stderr += line;
      onProgress?.(line);
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-2000) || `FFmpeg exited with code ${code}`));
    });
  });
}

export async function ensureLocalVideoSource(video: VideoRecord): Promise<string> {
  const cachePath = path.join(paths.videos, `${video.id}.mp4`);

  if (fs.existsSync(cachePath)) {
    return cachePath;
  }

  if (video.cloudinaryUrl) {
    ensureDirectories();
    await downloadCloudinaryVideo(video.cloudinaryUrl, cachePath);
    return cachePath;
  }

  const legacyPath = path.join(paths.videos, video.filename);
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  throw new Error(`Source file not found for ${video.originalName}`);
}

export async function normalizeVideoRecord(
  video: VideoRecord,
  onProgress?: (line: string) => void
): Promise<VideoRecord> {
  const inputPath = await ensureLocalVideoSource(video);
  const normalizedFilename = `${video.id}.mp4`;
  const outputPath = path.join(paths.processed, normalizedFilename);

  if (!fs.existsSync(outputPath)) {
    await normalizeVideo(inputPath, outputPath, onProgress);
  }

  return { ...video, normalizedFilename };
}

export function writePlaylistFile(processedPaths: string[]): void {
  ensureDirectories();
  const lines = processedPaths.map((p) => `file '${toConcatPath(p)}'`);
  fs.writeFileSync(paths.playlistFile, `${lines.join("\n")}\n`, "utf8");
}

export function buildStreamArgs(settings: StreamSettings): string[] {
  const maxrate = settings.bitrate;
  const numericRate = parseInt(maxrate.replace(/\D/g, ""), 10) || 3000;
  const bufsize = `${numericRate * 2}k`;
  const gop = settings.fps * 2;
  const rtmpTarget = settings.streamKey
    ? `${settings.rtmpUrl.replace(/\/$/, "")}/${settings.streamKey}`
    : settings.rtmpUrl;

  return [
    "-re",
    "-stream_loop",
    "-1",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    paths.playlistFile,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-maxrate",
    maxrate,
    "-bufsize",
    bufsize,
    "-s",
    settings.resolution,
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(settings.fps),
    "-g",
    String(gop),
    "-c:a",
    "aac",
    "-b:a",
    settings.audioBitrate,
    "-ar",
    "44100",
    "-f",
    "flv",
    rtmpTarget,
  ];
}

export function parseCurrentFileFromLog(line: string): string | null {
  const openingMatch = line.match(/Opening '([^']+)'/);
  if (openingMatch) return path.basename(openingMatch[1]);
  return null;
}

export async function checkFfmpegInstalled(): Promise<boolean> {
  try {
    await execFileAsync(getFfmpegPath(), ["-version"]);
    return true;
  } catch {
    return false;
  }
}
