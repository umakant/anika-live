import { NextResponse } from "next/server";
import { createClientUploadParams, isCloudinaryConfigured } from "@/lib/cloudinary";

export async function POST() {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
    }

    const params = createClientUploadParams();
    return NextResponse.json(params);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create upload signature";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
