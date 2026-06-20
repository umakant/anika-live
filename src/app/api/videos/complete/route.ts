import { NextRequest, NextResponse } from "next/server";
import { addVideo } from "@/lib/storage";
import type { VideoRecord } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      originalName?: string;
      cloudinaryPublicId?: string;
      cloudinaryUrl?: string;
      duration?: number;
      size?: number;
    };

    if (!body.id || !body.originalName || !body.cloudinaryPublicId || !body.cloudinaryUrl) {
      return NextResponse.json({ error: "Missing upload metadata" }, { status: 400 });
    }

    const record: VideoRecord = {
      id: body.id,
      filename: `${body.id}.mp4`,
      originalName: body.originalName,
      size: body.size || 0,
      duration: body.duration || 0,
      uploadedAt: new Date().toISOString(),
      storage: "cloudinary",
      cloudinaryPublicId: body.cloudinaryPublicId,
      cloudinaryUrl: body.cloudinaryUrl,
    };

    addVideo(record);
    return NextResponse.json({ video: record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
