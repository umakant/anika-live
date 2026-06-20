import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

function env(name: string): string {
  return (process.env[name] || "").trim();
}

const FOLDER = env("CLOUDINARY_FOLDER") || "anika-live/videos";

let configured = false;

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function parseCloudinaryUrl(url: string): CloudinaryCredentials | null {
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  return {
    apiKey: match[1],
    apiSecret: match[2],
    cloudName: match[3],
  };
}

function getCredentials(): CloudinaryCredentials | null {
  const url = env("CLOUDINARY_URL");
  if (url) {
    const parsed = parseCloudinaryUrl(url);
    if (parsed) return parsed;
  }

  const cloudName = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  if (!cloudName || !apiKey || !apiSecret) return null;

  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return getCredentials() !== null;
}

function ensureConfigured(): CloudinaryCredentials {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
    configured = true;
  }

  return credentials;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  duration: number;
  bytes: number;
  format: string;
}

export interface SignedUploadParams {
  mode: "signed";
  id: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadPreset?: string;
}

export interface UnsignedUploadParams {
  mode: "unsigned";
  id: string;
  cloudName: string;
  uploadPreset: string;
  folder: string;
}

export type ClientUploadParams = SignedUploadParams | UnsignedUploadParams;

export function createClientUploadParams(): ClientUploadParams {
  const { cloudName, apiKey, apiSecret } = ensureConfigured();
  const id = uuidv4();
  const uploadPreset = env("CLOUDINARY_UPLOAD_PRESET");
  const timestamp = Math.round(Date.now() / 1000);

  const params: Record<string, string | number> = {
    timestamp,
    folder: FOLDER,
    public_id: id,
  };

  if (uploadPreset) {
    params.upload_preset = uploadPreset;
  }

  const signature = cloudinary.utils.api_sign_request(params, apiSecret);

  return {
    mode: "signed",
    id,
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: FOLDER,
    uploadPreset: uploadPreset || undefined,
  };
}

export async function uploadVideoToCloudinary(
  buffer: Buffer,
  videoId: string,
  originalName: string
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  const uploadPreset = env("CLOUDINARY_UPLOAD_PRESET");
  const options: Record<string, string | boolean> = {
    resource_type: "video",
    folder: FOLDER,
    public_id: videoId,
    overwrite: true,
    context: `original_name=${originalName}`,
  };
  if (uploadPreset) {
    options.upload_preset = uploadPreset;
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
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
