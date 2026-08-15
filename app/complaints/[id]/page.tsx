import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { DashboardShell } from "@/components/dashboard-shell";
import { ComplaintDetail } from "@/components/complaint-detail";

function idOf(value: unknown) {
  if (!value) return undefined;
  // Populated users have an `_id`; a raw ObjectId can also expose internal
  // `_id` fields, so only unwrap once and never recursively follow it.
  const candidate = typeof value === "object" && "_id" in value && (value as { _id?: unknown })._id !== value
    ? (value as { _id?: unknown })._id
    : value;
  return candidate && typeof (candidate as { toString?: unknown }).toString === "function" ? String(candidate) : undefined;
}

function isNavigationError(error: unknown) {
  return Boolean((error as { digest?: string })?.digest?.startsWith("NEXT_"));
}

export default async function ComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();

  try {
    await connectToDatabase();
    const complaint = await Complaint.findById(id)
      .populate("citizen", "name email phone")
      .populate("assignedOfficer", "name email department")
      .lean();
    if (!complaint) notFound();

    const citizenId = idOf(complaint.citizen);
    const officerId = idOf(complaint.assignedOfficer);
    if (session.user.role === "CITIZEN" && citizenId !== session.user.id) redirect("/complaints");
    if (session.user.role === "OFFICER" && officerId !== session.user.id) redirect("/complaints");

    // Mongoose lean records still contain ObjectId instances. Client
    // components may only receive serializable values, so serialize all
    // nested ids, dates, timeline events, and attachments before rendering.
    const clientComplaint = JSON.parse(JSON.stringify(complaint));
    return <DashboardShell user={{ name: session.user.name ?? "Portal user", role: session.user.role }}><ComplaintDetail initialComplaint={clientComplaint} role={session.user.role} /></DashboardShell>;
  } catch (error) {
    if (isNavigationError(error)) throw error;
    const message = error instanceof Error ? error.message : "Unable to load this report.";
    return <DashboardShell user={{ name: session.user.name ?? "Portal user", role: session.user.role }}><p className="rounded-xl bg-red-50 p-5 text-red-800">Unable to load this report. {message}</p></DashboardShell>;
  }
}
