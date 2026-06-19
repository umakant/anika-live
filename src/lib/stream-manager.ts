import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import os from "os";
import { paths } from "./paths";
import { getFfmpegPath, buildStreamArgs, parseCurrentFileFromLog } from "./ffmpeg";
import {
  getStreamState,
  saveStreamState,
  appendStreamLog,
  getStreamLogs,
  getSettings,
} from "./storage";
import type { StreamState, SystemStats } from "./types";

const MAX_RESTARTS = 100;
const RESTART_DELAY_MS = 3000;

declare global {
  var __anikaStreamManager: StreamManager | undefined;
}

class StreamManager {
  private process: ChildProcess | null = null;
  private shouldRun = false;
  private restartTimer: NodeJS.Timeout | null = null;
  private memoryCache: number | null = null;

  constructor() {
    this.recoverFromDisk();
  }

  private recoverFromDisk(): void {
    const state = getStreamState();
    if (state.running && state.pid && this.isProcessAlive(state.pid)) {
      this.shouldRun = true;
    } else if (state.running && state.pid) {
      saveStreamState({
        ...state,
        running: false,
        pid: null,
        managedByApp: false,
      });
    }
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private log(line: string): void {
    appendStreamLog(`[${new Date().toISOString()}] ${line}`);
  }

  private updateState(partial: Partial<StreamState>): StreamState {
    const current = getStreamState();
    const next = { ...current, ...partial };
    saveStreamState(next);
    return next;
  }

  private clearRestartTimer(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private spawnFfmpeg(): void {
    const settings = getSettings();

    if (!fs.existsSync(paths.playlistFile)) {
      this.updateState({
        lastError: "Playlist file not found. Save a playlist first.",
        running: false,
      });
      this.shouldRun = false;
      return;
    }
    if (!settings.streamKey) {
      this.updateState({ lastError: "YouTube stream key is not configured", running: false });
      this.shouldRun = false;
      return;
    }

    const args = buildStreamArgs(settings);
    const cmd = `${getFfmpegPath()} ${args.join(" ")}`;
    this.log(`Starting FFmpeg: ${cmd.replace(settings.streamKey, "****")}`);

    const proc = spawn(getFfmpegPath(), args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    this.process = proc;
    const startedAt = getStreamState().startedAt || new Date().toISOString();

    this.updateState({
      running: true,
      pid: proc.pid ?? null,
      startedAt,
      lastError: null,
      managedByApp: true,
    });

    proc.stdout?.on("data", (chunk: Buffer) => {
      const line = chunk.toString().trim();
      if (line) this.log(line);
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      const line = chunk.toString().trim();
      if (!line) return;
      this.log(line);

      const currentFile = parseCurrentFileFromLog(line);
      if (currentFile) {
        this.updateState({ currentFile });
      }

      if (/error/i.test(line) && !/deprecated/i.test(line)) {
        this.updateState({ lastError: line.slice(0, 500) });
      }
    });

    proc.on("error", (err) => {
      this.log(`Process error: ${err.message}`);
      this.updateState({ lastError: err.message, running: false, pid: null });
      this.process = null;
      this.scheduleRestart();
    });

    proc.on("close", (code, signal) => {
      this.log(`FFmpeg exited (code=${code}, signal=${signal})`);
      this.process = null;
      this.memoryCache = null;

      const state = getStreamState();
      if (code !== 0 && code !== null) {
        this.updateState({
          lastError: state.lastError || `FFmpeg exited with code ${code}`,
          running: false,
          pid: null,
        });
      } else {
        this.updateState({ running: false, pid: null });
      }

      if (this.shouldRun) {
        this.scheduleRestart();
      }
    });
  }

  private scheduleRestart(): void {
    if (!this.shouldRun) return;

    const state = getStreamState();
    if (state.restartCount >= MAX_RESTARTS) {
      this.log("Max restart attempts reached. Stopping auto-restart.");
      this.shouldRun = false;
      this.updateState({ running: false, lastError: "Max restart attempts reached" });
      return;
    }

    this.clearRestartTimer();
    this.restartTimer = setTimeout(() => {
      if (!this.shouldRun) return;
      this.updateState({ restartCount: state.restartCount + 1 });
      this.log(`Auto-restarting (attempt ${state.restartCount + 1})...`);
      this.spawnFfmpeg();
    }, RESTART_DELAY_MS);
  }

  async start(): Promise<StreamState> {
    const settings = getSettings();
    if (!settings.streamKey) {
      throw new Error("YouTube stream key is required. Configure it in Stream Settings.");
    }

    if (this.process && this.process.pid && this.isProcessAlive(this.process.pid)) {
      return getStreamState();
    }

    this.shouldRun = true;
    this.clearRestartTimer();
    this.updateState({
      startedAt: new Date().toISOString(),
      restartCount: 0,
      currentFile: null,
      lastError: null,
    });
    this.spawnFfmpeg();
    return getStreamState();
  }

  async stop(): Promise<StreamState> {
    this.shouldRun = false;
    this.clearRestartTimer();

    const state = getStreamState();
    const pid = this.process?.pid ?? state.pid;

    if (pid && this.isProcessAlive(pid)) {
      this.log(`Stopping FFmpeg (pid ${pid})...`);
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", String(pid), "/f", "/t"]);
        } else {
          process.kill(pid, "SIGTERM");
          setTimeout(() => {
            if (this.isProcessAlive(pid)) {
              process.kill(pid, "SIGKILL");
            }
          }, 5000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to stop process";
        this.log(message);
      }
    }

    this.process = null;
    this.memoryCache = null;
    return this.updateState({
      running: false,
      pid: null,
      startedAt: null,
      currentFile: null,
      managedByApp: false,
    });
  }

  async restart(): Promise<StreamState> {
    await this.stop();
    return this.start();
  }

  getStatus(): StreamState & { uptimeSeconds: number | null; logLines: string[] } {
    const state = getStreamState();
    let running = state.running;
    let pid = state.pid;

    if (pid && !this.isProcessAlive(pid)) {
      running = false;
      pid = null;
    } else if (this.process?.pid && this.isProcessAlive(this.process.pid)) {
      running = true;
      pid = this.process.pid;
    }

    const uptimeSeconds =
      running && state.startedAt
        ? Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000)
        : null;

    return {
      ...state,
      running,
      pid,
      uptimeSeconds,
      logLines: getStreamLogs(100),
    };
  }

  getSystemStats(): SystemStats {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const state = getStreamState();
    let ffmpegMemoryMb: number | null = this.memoryCache;

    if (state.pid && process.platform !== "win32") {
      try {
        const status = fs.readFileSync(`/proc/${state.pid}/status`, "utf8");
        const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
        if (match) {
          ffmpegMemoryMb = Math.round(parseInt(match[1], 10) / 1024);
          this.memoryCache = ffmpegMemoryMb;
        }
      } catch {
        ffmpegMemoryMb = null;
      }
    }

    return {
      cpuLoad: os.loadavg(),
      memoryUsedMb: Math.round(usedMem / 1024 / 1024),
      memoryTotalMb: Math.round(totalMem / 1024 / 1024),
      memoryPercent: Math.round((usedMem / totalMem) * 100),
      ffmpegMemoryMb,
    };
  }
}

export function getStreamManager(): StreamManager {
  if (!global.__anikaStreamManager) {
    global.__anikaStreamManager = new StreamManager();
  }
  return global.__anikaStreamManager;
}
