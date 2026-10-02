import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Upload } from "@/models/Upload";
import { hasExpectedFileSignature, maxUploadSize, safeFilename, allowedUploadTypes } from "@/lib/upload-security";
import { rateLimit, requireSameOrigin } from "@/lib/request-security";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

function uploadToCloudinary(buffer: Buffer, mimeType: string, filename: string) {
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "civicguard-ai", resource_type: mimeType === "application/pdf" ? "raw" : "image", public_id: crypto.randomUUID() },
      (error, result) => error || !result ? reject(error ?? new Error("Upload failed")) : resolve(result)
    ).end(buffer);
  });
}

async function saveLocalDevelopmentFile(buffer: Buffer, mimeType: string) {
  const extension = extensions[mimeType];
  const storedFilename = `${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "private-uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedFilename), buffer);
  return storedFilename;
}

export async function POST(request: Request) {
  const access = await requireUser();
  if ("error" in access) return access.error;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const limitError = rateLimit(request, "upload", 20, 15 * 60 * 1000);
  if (limitError) return limitError;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
    if (!(allowedUploadTypes as readonly string[]).includes(file.type)) return NextResponse.json({ error: "Only JPG, PNG, and PDF files are supported" }, { status: 400 });
    if (file.size < 1 || file.size > maxUploadSize) return NextResponse.json({ error: "Files must be 10 MB or smaller" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedFileSignature(buffer, file.type)) return NextResponse.json({ error: "The file content does not match its declared type." }, { status: 400 });
    const filename = safeFilename(file.name);
    let storageKind: "LOCAL" | "CLOUDINARY";
    let storageKey: string;
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
      storageKey = (await uploadToCloudinary(buffer, file.type, filename)).secure_url;
      storageKind = "CLOUDINARY";
    } else {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "File storage is not configured." },
          { status: 503 }
        );
      }
      // Development files are kept outside /public and served through the
      // authenticated media route below; they are never directly enumerable.
      storageKey = await saveLocalDevelopmentFile(buffer, file.type);
      storageKind = "LOCAL";
    }
    await connectToDatabase();
    const upload = await Upload.create({ owner: access.user.id, filename, mimeType: file.type, size: file.size, storageKind, storageKey });
    return NextResponse.json({ url: new URL(`/api/uploads/${upload._id.toString()}`, request.url).toString(), uploadId: upload._id.toString(), filename, mimeType: file.type, size: file.size }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
