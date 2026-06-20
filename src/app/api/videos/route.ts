import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  uploadVideoToCloudinary,
  isCloudinaryConfigured,
  formatCloudinaryError,
} from "@/lib/cloudinary";
import { addVideo, getVideos } from "@/lib/storage";
import type { VideoRecord } from "@/lib/types";

export const maxDuration = 600;

export async function GET() {
  const videos = getVideos().sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  return NextResponse.json({ videos });
}

export async function POST(request: NextRequest) {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        {
          error:
            "Cloudinary is not configured. Set CLOUDINARY_URL in .env (see .env.example).",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json({ error: "Only MP4 files are supported" }, { status: 400 });
    }

    const id = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Upload failed: empty file. If the video is large, check Nginx client_max_body_size." },
        { status: 400 }
      );
    }

    const uploaded = await uploadVideoToCloudinary(buffer, id, file.name);

    const record: VideoRecord = {
      id,
      filename: `${id}.mp4`,
      originalName: file.name,
      size: uploaded.bytes,
      duration: uploaded.duration,
      uploadedAt: new Date().toISOString(),
      storage: "cloudinary",
      cloudinaryPublicId: uploaded.publicId,
      cloudinaryUrl: uploaded.secureUrl,
    };

    addVideo(record);
    return NextResponse.json({ video: record });
  } catch (err) {
    console.error("Video upload error:", err);
    const message = formatCloudinaryError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
