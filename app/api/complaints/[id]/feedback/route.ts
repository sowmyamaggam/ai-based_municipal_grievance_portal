import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { feedbackSchema } from "@/lib/validation";
import { Complaint } from "@/models/Complaint";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { Types } from "mongoose";
import { rateLimit, requireSameOrigin } from "@/lib/request-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireUser(["CITIZEN"]);
  if ("error" in access) return access.error;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const limitError = rateLimit(request, "feedback", 10, 60 * 60 * 1000);
  if (limitError) return limitError;
  try {
    const data = feedbackSchema.parse(await request.json());
    await connectToDatabase();
    const id = (await context.params).id;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    const complaint = await Complaint.findOne({ _id: id, citizen: access.user.id });
    if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    if (!['RESOLVED', 'CLOSED'].includes(complaint.status)) return NextResponse.json({ error: "Feedback is available after resolution" }, { status: 400 });
    complaint.feedback = { ...data, submittedAt: new Date() };
    complaint.history.push({ action: "FEEDBACK_SUBMITTED", actor: access.user.id, actorName: access.user.name, newValue: data.rating, remarks: data.comment });
    await complaint.save();
    // Feedback is part of service-quality monitoring, so the responsible
    // officer and administrators receive it in their normal notification feed.
    try {
      const admins = await User.find({ role: "ADMIN", active: true }).select("_id").lean();
      const recipients = [
        ...(complaint.assignedOfficer ? [complaint.assignedOfficer] : []),
        ...admins.map((admin: { _id: { toString(): string } }) => admin._id),
      ];
      await Promise.allSettled(recipients.map((user) => Notification.create({ user, complaint: complaint._id, title: "Citizen feedback received", message: `${complaint.complaintNumber} received a ${data.rating}/5 rating${data.comment ? "." : ". No written comment was provided."}` })));
    } catch {
      // Saving feedback must never depend on notification infrastructure.
    }
    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate("citizen", "name phone")
      .populate("assignedOfficer", "name phone department");
    return NextResponse.json({ complaint: updatedComplaint });
  } catch (error) {
    return NextResponse.json({ error: "Unable to save feedback. Check the details and try again." }, { status: 400 });
  }
}
