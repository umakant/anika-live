import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";
import { deleteVideoFromCloudinary } from "@/lib/cloudinary";
import {
  getVideoById,
  removeVideo,
  getPlaylist,
  savePlaylist,
} from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const video = removeVideo(id);
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.cloudinaryPublicId) {
      try {
        await deleteVideoFromCloudinary(video.cloudinaryPublicId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Cloudinary delete failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    const cachePath = path.join(paths.videos, `${video.id}.mp4`);
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);

    const rawPath = path.join(paths.videos, video.filename);
    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);

    if (video.normalizedFilename) {
      const processedPath = path.join(paths.processed, video.normalizedFilename);
      if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
    }

    const playlist = getPlaylist();
    if (playlist.videoIds.includes(id)) {
      savePlaylist({
        videoIds: playlist.videoIds.filter((vid) => vid !== id),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const video = getVideoById(id);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (video.cloudinaryUrl) {
    return NextResponse.redirect(video.cloudinaryUrl);
  }

  const filePath = path.join(paths.videos, video.filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const range = _request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    return new NextResponse(stream as unknown as BodyInit, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    },
  });
}
