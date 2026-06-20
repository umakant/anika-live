import { NextResponse } from "next/server";
import { getPlaylistSaveProgress } from "@/lib/storage";

export async function GET() {
  return NextResponse.json({ progress: getPlaylistSaveProgress() });
}
