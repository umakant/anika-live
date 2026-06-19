import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import fs from "fs";

const FOLDER = process.env.CLOUDINARY_FOLDER || "anika-live/videos";

let configured = false;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function ensureConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  duration: number;
  bytes: number;
  format: string;
}

export async function uploadVideoToCloudinary(
  buffer: Buffer,
  videoId: string,
  originalName: string
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: FOLDER,
        public_id: videoId,
        overwrite: true,
        context: `original_name=${originalName}`,
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else if (uploadResult) resolve(uploadResult);
        else reject(new Error("Cloudinary upload returned no result"));
      }
    );
    stream.end(buffer);
  });

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    duration: result.duration || 0,
    bytes: result.bytes || buffer.length,
    format: result.format || "mp4",
  };
}

export async function deleteVideoFromCloudinary(publicId: string): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
}

export async function downloadCloudinaryVideo(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video from Cloudinary (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

export function getCloudinaryVideoUrl(publicId: string): string {
  ensureConfigured();
  return cloudinary.url(publicId, {
    resource_type: "video",
    secure: true,
  });
}
