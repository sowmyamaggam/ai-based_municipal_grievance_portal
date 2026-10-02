import { Types } from "mongoose";
import { Upload } from "@/models/Upload";

export const allowedUploadTypes = ["image/jpeg", "image/png", "application/pdf"] as const;
export const maxUploadSize = 10 * 1024 * 1024;

export function safeFilename(filename: string) {
  const normalized = filename.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return (normalized || "attachment").slice(0, 180);
}

export function hasExpectedFileSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export function uploadIdFromUrl(value: string, request: Request) {
  try {
    const url = new URL(value);
    if (url.origin !== new URL(request.url).origin) return null;
    const match = url.pathname.match(/^\/api\/uploads\/([a-fA-F0-9]{24})$/);
    return match?.[1] && Types.ObjectId.isValid(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

export async function validateOwnedAttachments(
  attachments: Array<{ url: string; uploadId?: string }>,
  ownerId: string,
  request: Request
) {
  if (!attachments.length) return true;
  const ids = attachments.map((attachment) => attachment.uploadId || uploadIdFromUrl(attachment.url, request));
  if (ids.some((id) => !id)) return false;
  const uniqueIds = [...new Set(ids as string[])];
  const count = await Upload.countDocuments({ _id: { $in: uniqueIds }, owner: ownerId });
  return count === uniqueIds.length;
}
