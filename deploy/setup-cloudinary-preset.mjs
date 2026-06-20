/**
 * Creates the unsigned Cloudinary upload preset (requires Admin API access).
 * Run: node deploy/setup-cloudinary-preset.mjs
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, "..");
const envPath = join(appDir, ".env");

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(envPath);

const presetName = process.env.CLOUDINARY_UPLOAD_PRESET || "anika_live_unsigned";
const folder = process.env.CLOUDINARY_FOLDER || "anika-live/videos";

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL, secure: true });
} else if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.error("Missing CLOUDINARY_URL or individual Cloudinary env vars in .env");
  process.exit(1);
}

async function main() {
  console.log("Testing Cloudinary credentials...");
  await cloudinary.api.ping();
  console.log("Credentials OK. Cloud:", cloudinary.config().cloud_name);

  try {
    await cloudinary.api.create_upload_preset({
      name: presetName,
      unsigned: true,
      folder,
      allowed_formats: "mp4",
    });
    console.log(`Created upload preset: ${presetName}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(message)) {
      console.log(`Upload preset already exists: ${presetName}`);
      return;
    }
    console.error("Failed to create preset:", message);
    console.error("");
    console.error("Create it manually in Cloudinary:");
    console.error("  Settings → Upload → Upload presets → Add upload preset");
    console.error(`  Name: ${presetName}`);
    console.error("  Signing mode: Unsigned");
    console.error(`  Folder: ${folder}`);
    console.error("  Resource type: Video");
    console.error("");
    console.error("If credentials fail, use the Root API key/secret from Cloudinary → API Keys.");
    process.exit(1);
  }
}

main();
