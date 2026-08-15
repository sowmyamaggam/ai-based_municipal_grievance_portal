import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { analyzeComplaint } from "@/lib/ai";
import { detectDuplicates } from "@/lib/duplicates";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireUser(["OFFICER", "ADMIN"]);
  if ("error" in access) return access.error;
  try {
    const id = (await context.params).id;
    await connectToDatabase();
    const complaint = await Complaint.findById(id).select("assignedOfficer");
    if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    if (access.user.role === "OFFICER" && complaint.assignedOfficer?.toString() !== access.user.id) return NextResponse.json({ error: "This complaint is not assigned to you" }, { status: 403 });
    const analysis = await analyzeComplaint(id);
    const matches = await detectDuplicates(id);
    return NextResponse.json({ analysis, matches });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI retry failed" }, { status: 500 });
  }
}
