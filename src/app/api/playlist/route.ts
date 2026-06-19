import { NextResponse } from "next/server";
import { getPlaylist, getVideos } from "@/lib/storage";

export async function GET() {
  const playlist = getPlaylist();
  const videos = getVideos();
  const items = playlist.videoIds
    .map((id) => videos.find((v) => v.id === id))
    .filter(Boolean);

  return NextResponse.json({ playlist, items });
}
