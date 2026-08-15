import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AssignmentNotification = {
  complaintId: string;
  complaintNumber: string;
  officerId: string;
  citizenId?: string;
  previousOfficerId?: string;
};

export async function sendAssignmentNotifications({ complaintId, complaintNumber, officerId, citizenId, previousOfficerId }: AssignmentNotification) {
  const notifications = [
    {
      user: officerId,
      complaint: complaintId,
      title: "New work assignment",
      message: `${complaintNumber} has been assigned to you. Review and accept the work before starting.`,
    },
    ...(citizenId ? [{
      user: citizenId,
      complaint: complaintId,
      title: "Officer assigned",
      message: `${complaintNumber} is now with a municipal officer for review.`,
    }] : []),
    ...(previousOfficerId && previousOfficerId !== officerId ? [{
      user: previousOfficerId,
      complaint: complaintId,
      title: "Work reassigned",
      message: `${complaintNumber} has been reassigned by an administrator.`,
    }] : []),
  ];

  await Promise.allSettled(notifications.map((notification) => Notification.create(notification)));
}

export async function notifyAssignmentDecision({
  complaintId,
  complaintNumber,
  citizenId,
  officerName,
  decision,
}: {
  complaintId: string;
  complaintNumber: string;
  citizenId?: string;
  officerName: string;
  decision: "ACCEPTED" | "DECLINED";
}) {
  await connectToDatabase();
  const admins = await User.find({ role: "ADMIN", active: true }).select("_id").lean();
  const action = decision === "ACCEPTED" ? "accepted" : "declined";
  const notifications = [
    ...admins.map((admin: { _id: { toString(): string } }) => ({
      user: admin._id,
      complaint: complaintId,
      title: `Officer ${action} work`,
      message: `${officerName} ${action} ${complaintNumber}.${decision === "DECLINED" ? " Please assign another officer." : ""}`,
    })),
    ...(citizenId && decision === "ACCEPTED" ? [{
      user: citizenId,
      complaint: complaintId,
      title: "Work started",
      message: `A municipal officer accepted ${complaintNumber} and has started work.`,
    }] : []),
  ];
  await Promise.allSettled(notifications.map((notification) => Notification.create(notification)));
}

/** Select the least-loaded active officer in the complaint's routed department. */
export async function autoAssignComplaint(complaintId: string) {
  await connectToDatabase();
  const complaint = await Complaint.findById(complaintId).select("complaintNumber department citizen status assignedOfficer").lean();
  if (!complaint || complaint.assignedOfficer || complaint.status !== "SUBMITTED" || !complaint.department || complaint.department === "Unassigned") return { assigned: false };

  const department = new RegExp(`^${escapeRegex(complaint.department)}$`, "i");
  const officers = await User.find({ role: "OFFICER", active: true, department }).select("_id name").sort({ name: 1 }).lean();
  if (!officers.length) return { assigned: false, reason: "No active officer is mapped to this department" };

  const workload = await Complaint.aggregate([
    { $match: { assignedOfficer: { $in: officers.map((officer: { _id: unknown }) => officer._id) }, status: { $nin: ["RESOLVED", "CLOSED", "REJECTED"] } } },
    { $group: { _id: "$assignedOfficer", count: { $sum: 1 } } },
  ]);
  const loadByOfficer = new Map<string, number>(workload.map((item: { _id: { toString(): string }; count: number }) => [item._id.toString(), item.count]));
  const officer = [...officers].sort((first: { _id: { toString(): string }; name: string }, second: { _id: { toString(): string }; name: string }) => (loadByOfficer.get(first._id.toString()) ?? 0) - (loadByOfficer.get(second._id.toString()) ?? 0) || first.name.localeCompare(second.name))[0];
  const now = new Date();
  const updated = await Complaint.findOneAndUpdate(
    { _id: complaintId, status: "SUBMITTED", $or: [{ assignedOfficer: { $exists: false } }, { assignedOfficer: null }] },
    {
      $set: { assignedOfficer: officer._id, assignmentStatus: "PENDING", assignedAt: now, assignmentRespondedAt: null, status: "ASSIGNED" },
      $push: {
        history: {
          $each: [
            { action: "OFFICER_ASSIGNED", actorName: "Municipal portal routing", newValue: officer._id, remarks: `Automatically routed to ${officer.name} based on department and current workload.` },
            { action: "STATUS_CHANGED", actorName: "Municipal portal routing", previousValue: "SUBMITTED", newValue: "ASSIGNED", remarks: "Awaiting officer acceptance." },
          ],
        },
      },
    },
    { new: true }
  ).lean();
  if (!updated) return { assigned: false };

  await sendAssignmentNotifications({
    complaintId: updated._id.toString(),
    complaintNumber: updated.complaintNumber,
    officerId: officer._id.toString(),
    citizenId: updated.citizen?.toString(),
  });
  return { assigned: true, officerName: officer.name };
}
