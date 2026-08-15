import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { requireUser } from "@/lib/authorization";

const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
const maxSize = 10 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

function uploadToCloudinary(buffer: Buffer, mimeType: string, filename: string) {
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "civicguard-ai", resource_type: mimeType === "application/pdf" ? "raw" : "image", public_id: filename.replace(/\.[^.]+$/, "") },
      (error, result) => error || !result ? reject(error ?? new Error("Upload failed")) : resolve(result)
    ).end(buffer);
  });
}

async function saveLocalDevelopmentFile(buffer: Buffer, mimeType: string, request: Request) {
  const extension = extensions[mimeType];
  const storedFilename = `${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedFilename), buffer);
  return new URL(`/uploads/${storedFilename}`, request.url).toString();
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("error" in access) return access.error;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: "Only JPG, PNG, and PDF files are supported" }, { status: 400 });
    if (file.size > maxSize) return NextResponse.json({ error: "Files must be 10 MB or smaller" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let url: string;
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
      url = (await uploadToCloudinary(buffer, file.type, `${Date.now()}-${file.name}`)).secure_url;
    } else {
      // Never put a base64 file payload in MongoDB. Local URLs keep development
      // uploads usable while production uses durable object storage.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "File storage is not configured. Add Cloudinary credentials before accepting uploads in production." }, { status: 503 });
      }
      url = await saveLocalDevelopmentFile(buffer, file.type, request);
    }
    return NextResponse.json({ url, filename: file.name, mimeType: file.type, size: file.size }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
