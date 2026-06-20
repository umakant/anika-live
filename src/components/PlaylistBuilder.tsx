"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card } from "./ui";
import { formatDuration } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

function SortableItem({ video }: { video: VideoRecord }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: video.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
    >
      <button
        className="cursor-grab px-2 text-slate-500 hover:text-slate-300"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{video.originalName}</p>
        <p className="text-xs text-slate-500">{formatDuration(video.duration)}</p>
      </div>
    </div>
  );
}

export function PlaylistBuilder() {
  const [allVideos, setAllVideos] = useState<VideoRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadData = useCallback(async () => {
    const [videosRes, playlistRes] = await Promise.all([
      fetch("/api/videos"),
      fetch("/api/playlist"),
    ]);
    if (videosRes.ok) {
      const data = await videosRes.json();
      setAllVideos(data.videos);
    }
    if (playlistRes.ok) {
      const data = await playlistRes.json();
      setSelectedIds(data.playlist.videoIds || []);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedVideos = selectedIds
    .map((id) => allVideos.find((v) => v.id === id))
    .filter(Boolean) as VideoRecord[];

  const availableVideos = allVideos.filter((v) => !selectedIds.includes(v.id));

  function toggleVideo(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelectedIds((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  async function savePlaylist() {
    setSaving(true);
    setMessage("Starting playlist save...");
    setError(null);

    const progressInterval = window.setInterval(async () => {
      try {
        const res = await fetch("/api/playlist/save/progress");
        if (!res.ok) return;
        const data = await res.json();
        const p = data.progress;
        if (!p?.active) return;
        const step =
          p.step === "normalize"
            ? "Normalizing"
            : p.step === "download"
              ? "Preparing"
              : p.step === "write"
                ? "Writing playlist"
                : "Processing";
        setMessage(`${step} video ${p.current} of ${p.total}${p.videoName ? `: ${p.videoName}` : ""}...`);
      } catch {
        // ignore poll errors
      }
    }, 2000);

    try {
      const res = await fetch("/api/playlist/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage(
        `Playlist saved with ${data.normalizedCount} normalized video(s). File: ${data.playlistFile}`
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setMessage(null);
    } finally {
      window.clearInterval(progressInterval);
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-medium">Available Videos</h3>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {availableVideos.length === 0 && (
            <p className="text-sm text-slate-500">All videos are in the playlist.</p>
          )}
          {availableVideos.map((video) => (
            <label
              key={video.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 px-3 py-2 hover:bg-slate-800/40"
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleVideo(video.id)}
              />
              <div>
                <p className="text-sm font-medium">{video.originalName}</p>
                <p className="text-xs text-slate-500">{formatDuration(video.duration)}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Playlist Order</h3>
          <Button onClick={savePlaylist} disabled={saving || selectedIds.length === 0}>
            {saving ? "Normalizing & Saving..." : "Save Playlist"}
          </Button>
        </div>

        <p className="mb-3 text-xs text-slate-400">
          First save downloads each video from Cloudinary and normalizes it (about 1–3 min per
          video). Re-saving the same playlist is much faster. Keep this tab open until finished.
        </p>

        {message && (
          <p className="mb-3 rounded-lg bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-3 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {selectedVideos.length === 0 && (
                <p className="text-sm text-slate-500">Select videos from the left panel.</p>
              )}
              {selectedVideos.map((video) => (
                <div key={video.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SortableItem video={video} />
                  </div>
                  <Button variant="ghost" onClick={() => toggleVideo(video.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Card>
    </div>
  );
}
