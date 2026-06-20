"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "./ui";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

export function VideoManager() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    const res = await fetch("/api/videos");
    if (res.ok) {
      const data = await res.json();
      setVideos(data.videos);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(`Uploading ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/videos", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage(`Uploaded ${file.name}`);
      await loadVideos();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this video?")) return;
    const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (previewId === id) setPreviewId(null);
      await loadVideos();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-3 text-lg font-medium">Upload MP4 Video</h3>
        <p className="mb-3 text-xs text-slate-400">
          Videos upload through the server to Cloudinary (uses API secret — no browser permission
          issues). Local copies are cached when building a playlist for FFmpeg streaming.
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 hover:border-rose-500/50">
          <span className="mb-2 text-sm text-slate-300">
            {uploading ? "Uploading..." : "Click to select an MP4 file"}
          </span>
          <span className="text-xs text-slate-500">YouTube Shorts / vertical videos recommended</span>
          <input
            type="file"
            accept="video/mp4,.mp4"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
        {message && (
          <p
            className={`mt-3 text-sm ${
              /fail|error/i.test(message) ? "text-red-400" : "text-slate-300"
            }`}
          >
            {message}
          </p>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h3 className="mb-4 text-lg font-medium">Uploaded Videos</h3>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="pb-2 pr-4">Filename</th>
              <th className="pb-2 pr-4">Duration</th>
              <th className="pb-2 pr-4">Size</th>
              <th className="pb-2 pr-4">Storage</th>
              <th className="pb-2 pr-4">Uploaded</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-slate-500">
                  No videos uploaded yet.
                </td>
              </tr>
            )}
            {videos.map((video) => (
              <tr key={video.id} className="border-b border-slate-800/80">
                <td className="py-3 pr-4">
                  <div className="font-medium">{video.originalName}</div>
                  <div className="text-xs text-slate-500">{video.filename}</div>
                </td>
                <td className="py-3 pr-4">{formatDuration(video.duration)}</td>
                <td className="py-3 pr-4">{formatBytes(video.size)}</td>
                <td className="py-3 pr-4 capitalize">{video.storage || "local"}</td>
                <td className="py-3 pr-4">{formatDate(video.uploadedAt)}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setPreviewId(video.id)}>
                      Preview
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(video.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {previewId && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-medium">Preview</h3>
            <Button variant="ghost" onClick={() => setPreviewId(null)}>
              Close
            </Button>
          </div>
          <video
            controls
            className="mx-auto max-h-[70vh] w-full max-w-sm rounded-lg bg-black"
            src={
              videos.find((v) => v.id === previewId)?.cloudinaryUrl ||
              `/api/videos/${previewId}`
            }
          />
        </Card>
      )}
    </div>
  );
}
