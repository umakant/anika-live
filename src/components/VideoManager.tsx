"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "./ui";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  duration?: number;
  bytes?: number;
  error?: { message: string };
}

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
    setMessage("Preparing upload...");
    try {
      const signRes = await fetch("/api/videos/sign", { method: "POST" });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || "Failed to prepare upload");

      setMessage(`Uploading ${file.name} to Cloudinary...`);

      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("api_key", sign.apiKey);
      cloudForm.append("timestamp", String(sign.timestamp));
      cloudForm.append("signature", sign.signature);
      cloudForm.append("folder", sign.folder);
      cloudForm.append("public_id", sign.id);
      if (sign.uploadPreset) {
        cloudForm.append("upload_preset", sign.uploadPreset);
      }

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/video/upload`,
        { method: "POST", body: cloudForm }
      );
      const cloudData = (await cloudRes.json()) as CloudinaryUploadResponse;
      if (!cloudRes.ok) {
        throw new Error(cloudData.error?.message || "Cloudinary upload failed");
      }

      setMessage("Saving video metadata...");

      const completeRes = await fetch("/api/videos/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sign.id,
          originalName: file.name,
          cloudinaryPublicId: cloudData.public_id,
          cloudinaryUrl: cloudData.secure_url,
          duration: cloudData.duration || 0,
          size: cloudData.bytes || file.size,
        }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || "Failed to save video");

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
          Videos upload directly to Cloudinary using a signed upload preset. Local copies are
          cached only when building a playlist for FFmpeg streaming.
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
          <p className={`mt-3 text-sm ${message.includes("failed") || message.includes("Failed") ? "text-red-400" : "text-slate-300"}`}>
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
