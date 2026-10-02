import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Upload } from "@/models/Upload";
import { Complaint } from "@/models/Complaint";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireUser();
  if ("error" in access) return access.error;
  const id = (await context.params).id;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "File not found" }, { status: 404 });
  try {
    await connectToDatabase();
    const upload = await Upload.findById(id).lean();
    if (!upload) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const owned = upload.owner.toString() === access.user.id;
    let authorized = owned;
    if (!authorized && access.user.role === "ADMIN") {
      authorized = true;
    } else if (!authorized && access.user.role === "CITIZEN") {
      const complaint = await Complaint.findOne({ citizen: access.user.id, "resolutionEvidence.uploadId": upload._id }).select("_id").lean();
      authorized = Boolean(complaint);
    } else if (!authorized && access.user.role === "OFFICER") {
      const complaint = await Complaint.findOne({
        assignedOfficer: access.user.id,
        $or: [
          { "attachments.uploadId": upload._id },
          { "resolutionEvidence.uploadId": upload._id },
        ],
      }).select("_id").lean();
      authorized = Boolean(complaint);
    }
    if (!authorized) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const bytes = upload.storageKind === "LOCAL"
      ? await readFile(`${process.cwd()}\\private-uploads\\${upload.storageKey}`)
      : await (await fetch(upload.storageKey, { signal: AbortSignal.timeout(10_000) })).arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `${upload.mimeType === "application/pdf" ? "attachment" : "inline"}; filename="${upload.filename.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File is unavailable" }, { status: 404 });
  }
}
