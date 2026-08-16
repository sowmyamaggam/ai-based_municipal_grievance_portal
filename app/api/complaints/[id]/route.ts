import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { complaintUpdateSchema } from "@/lib/validation";
import { Complaint } from "@/models/Complaint";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { notifyAssignmentDecision, sendAssignmentNotifications } from "@/lib/assignment";
import { queueWhatsAppNotification, notifyStatusChanged, notifyComplaintAssigned } from "@/lib/whatsapp-notifications";

async function getAuthorizedComplaint(id: string, user: { id: string; role: "CITIZEN" | "OFFICER" | "ADMIN" }) {
  const complaint = await Complaint.findById(id).populate("citizen", "name email phone").populate("assignedOfficer", "name email department");
  if (!complaint) return { error: NextResponse.json({ error: "Complaint not found" }, { status: 404 }) };
  const citizenId = complaint.citizen?._id?.toString() ?? complaint.citizen?.toString();
  const officerId = complaint.assignedOfficer?._id?.toString() ?? complaint.assignedOfficer?.toString();
  if (user.role === "CITIZEN" && citizenId !== user.id) return { error: NextResponse.json({ error: "You can only access your own complaints" }, { status: 403 }) };
  if (user.role === "OFFICER" && officerId !== user.id) return { error: NextResponse.json({ error: "This complaint is not assigned to you" }, { status: 403 }) };
  return { complaint };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireUser();
  if ("error" in access) return access.error;
  try {
    await connectToDatabase();
    const result = await getAuthorizedComplaint((await context.params).id, access.user);
    if ("error" in result) return result.error;
    return NextResponse.json({ complaint: result.complaint });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load complaint" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireUser(["OFFICER", "ADMIN"]);
  if ("error" in access) return access.error;
  try {
    const data = complaintUpdateSchema.parse(await request.json());
    if (access.user.role !== "ADMIN" && data.assignedOfficer !== undefined) return NextResponse.json({ error: "Only administrators can change officer assignments" }, { status: 403 });
    if (data.assignmentDecision && access.user.role !== "OFFICER") return NextResponse.json({ error: "Only the assigned officer can accept or decline work" }, { status: 403 });
    await connectToDatabase();
    if (data.assignedOfficer) {
      const officer = await User.exists({ _id: data.assignedOfficer, role: "OFFICER", active: true });
      if (!officer) return NextResponse.json({ error: "Select an active officer account" }, { status: 400 });
    }
    const result = await getAuthorizedComplaint((await context.params).id, access.user);
    if ("error" in result) return result.error;
    const complaint = result.complaint;
    const citizenId = (complaint.citizen?._id ?? complaint.citizen)?.toString();
    const currentOfficerId = (complaint.assignedOfficer?._id ?? complaint.assignedOfficer)?.toString();

    if (data.assignmentDecision) {
      if (complaint.assignmentStatus !== "PENDING") return NextResponse.json({ error: "This assignment is no longer awaiting your approval" }, { status: 400 });
      const now = new Date();
      const accepted = data.assignmentDecision === "ACCEPTED";
      const updated = await Complaint.findByIdAndUpdate(
        complaint._id,
        {
          $set: accepted
            ? { assignmentStatus: "ACCEPTED", assignmentRespondedAt: now, status: "IN_PROGRESS" }
            : { assignmentStatus: "DECLINED", assignmentRespondedAt: now, assignedOfficer: null, status: "SUBMITTED" },
          $push: {
            history: {
              $each: [
                { action: accepted ? "ASSIGNMENT_ACCEPTED" : "ASSIGNMENT_DECLINED", actor: access.user.id, actorName: access.user.name, previousValue: "PENDING", newValue: data.assignmentDecision, remarks: data.remarks },
                { action: "STATUS_CHANGED", actor: access.user.id, actorName: access.user.name, previousValue: complaint.status, newValue: accepted ? "IN_PROGRESS" : "SUBMITTED", remarks: accepted ? "Officer accepted the assigned work." : "Officer declined the assigned work; it requires reassignment." },
              ],
            },
          },
        },
        { new: true }
      ).populate("citizen", "name email").populate("assignedOfficer", "name email department");
      try {
        await notifyAssignmentDecision({
          complaintId: complaint._id.toString(),
          complaintNumber: complaint.complaintNumber,
          citizenId,
          officerName: access.user.name,
          decision: data.assignmentDecision,
        });
        // Send WhatsApp notification
        if (citizenId) {
          queueWhatsAppNotification({
            type: accepted ? "COMPLAINT_ASSIGNED" : "STATUS_CHANGED",
            complaintId: complaint._id,
            complaintNumber: complaint.complaintNumber,
            citizenId: citizenId as any,
            data: accepted
              ? { officerName: access.user.name }
              : { newStatus: accepted ? "IN_PROGRESS" : "SUBMITTED" },
          });
        }
      } catch {
        // The decision is already durable; notification delivery can recover
        // independently and must not make the officer think it failed.
      }
      return NextResponse.json({ complaint: updated });
    }

    // An officer must explicitly accept a newly assigned job before changing
    // its lifecycle, routing, or resolution details. Legacy assignments that
    // predate this workflow remain manageable.
    if (access.user.role === "OFFICER" && complaint.assignmentStatus === "PENDING") {
      return NextResponse.json({ error: "Accept or decline this assignment before updating the complaint" }, { status: 403 });
    }

    const history: Record<string, unknown>[] = [];
    const set: Record<string, unknown> = {};
    for (const key of ["priority", "category", "department", "resolutionRemarks", "resolutionEvidence"] as const) {
      if (data[key] !== undefined && String(complaint.get(key) ?? "") !== String(data[key] ?? "")) {
        set[key] = data[key];
        history.push({ action: "COMPLAINT_UPDATED", actor: access.user.id, actorName: access.user.name, previousValue: complaint.get(key), newValue: data[key], remarks: data.remarks });
      }
    }
    const assignmentChanged = data.assignedOfficer !== undefined && currentOfficerId !== (data.assignedOfficer ?? undefined);
    if (assignmentChanged) {
      const hasNewOfficer = Boolean(data.assignedOfficer);
      set.assignedOfficer = data.assignedOfficer;
      set.assignmentStatus = hasNewOfficer ? "PENDING" : "UNASSIGNED";
      set.assignedAt = hasNewOfficer ? new Date() : null;
      set.assignmentRespondedAt = null;
      const nextStatus = hasNewOfficer ? "ASSIGNED" : "SUBMITTED";
      set.status = nextStatus;
      history.push({ action: hasNewOfficer ? "OFFICER_ASSIGNED" : "OFFICER_UNASSIGNED", actor: access.user.id, actorName: access.user.name, previousValue: currentOfficerId, newValue: data.assignedOfficer, remarks: hasNewOfficer ? "Awaiting officer acceptance." : data.remarks });
      if (complaint.status !== nextStatus) history.push({ action: "STATUS_CHANGED", actor: access.user.id, actorName: access.user.name, previousValue: complaint.status, newValue: nextStatus, remarks: hasNewOfficer ? "Awaiting officer acceptance." : "Assignment removed; the complaint is waiting for reassignment." });
    } else if (data.status !== undefined && data.status !== complaint.status) {
      set.status = data.status;
      history.push({ action: "STATUS_CHANGED", actor: access.user.id, actorName: access.user.name, previousValue: complaint.status, newValue: data.status, remarks: data.remarks });
    }
    if (!Object.keys(set).length) return NextResponse.json({ complaint, message: "No changes to save" });
    const updated = await Complaint.findByIdAndUpdate(complaint._id, { $set: set, $push: { history: { $each: history } } }, { new: true }).populate("citizen", "name email").populate("assignedOfficer", "name email department");
    if (assignmentChanged && data.assignedOfficer) {
      await sendAssignmentNotifications({ complaintId: complaint._id.toString(), complaintNumber: complaint.complaintNumber, officerId: data.assignedOfficer, citizenId, previousOfficerId: currentOfficerId });
      // Send WhatsApp notification for assignment
      if (citizenId) {
        queueWhatsAppNotification({
          type: "COMPLAINT_ASSIGNED",
          complaintId: complaint._id,
          complaintNumber: complaint.complaintNumber,
          citizenId: citizenId as any,
          data: { officerName: access.user.name },
        });
      }
    } else if (assignmentChanged && currentOfficerId) {
      await Promise.allSettled([
        Notification.create({ user: currentOfficerId, complaint: complaint._id, title: "Work unassigned", message: `${complaint.complaintNumber} is no longer assigned to you.` }),
        ...(citizenId ? [Notification.create({ user: citizenId, complaint: complaint._id, title: "Assignment updated", message: `${complaint.complaintNumber} is awaiting reassignment to a municipal officer.` })] : []),
      ]);
    } else if (data.status !== undefined && data.status !== complaint.status && citizenId) {
      const resolved = ["RESOLVED", "CLOSED"].includes(data.status);
      await Promise.allSettled([Notification.create({ user: citizenId, complaint: complaint._id, kind: resolved ? "COMPLAINT_RESOLVED" : "STATUS_UPDATED", title: resolved ? "Issue resolved" : "Complaint status updated", message: resolved ? `${complaint.complaintNumber} has been resolved by the municipal team.` : `${complaint.complaintNumber} is now ${data.status.replaceAll("_", " ").toLowerCase()}.` })]);
      // Send WhatsApp notification for status change
      queueWhatsAppNotification({
        type: resolved ? "RESOLVED" : "STATUS_CHANGED",
        complaintId: complaint._id,
        complaintNumber: complaint.complaintNumber,
        citizenId: citizenId as any,
        data: { newStatus: data.status, remarks: data.remarks },
      });
    }
    return NextResponse.json({ complaint: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update complaint" }, { status: 400 });
  }
}
