import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { analyzeComplaint } from "@/lib/ai";
import { detectDuplicates } from "@/lib/duplicates";
import { rateLimit, requireSameOrigin } from "@/lib/request-security";
import { Types } from "mongoose";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireUser(["OFFICER", "ADMIN"]);
  if ("error" in access) return access.error;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const limitError = rateLimit(request, "complaint-analysis", 10, 15 * 60 * 1000);
  if (limitError) return limitError;
  try {
    const id = (await context.params).id;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    await connectToDatabase();
    const complaint = await Complaint.findById(id).select("assignedOfficer");
    if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    if (access.user.role === "OFFICER" && complaint.assignedOfficer?.toString() !== access.user.id) return NextResponse.json({ error: "This complaint is not assigned to you" }, { status: 403 });
    const analysis = await analyzeComplaint(id);
    const matches = await detectDuplicates(id);
    return NextResponse.json({ analysis, matches });
  } catch (error) {
    return NextResponse.json({ error: "AI analysis is currently unavailable. The complaint remains safely stored." }, { status: 503 });
  }
}
