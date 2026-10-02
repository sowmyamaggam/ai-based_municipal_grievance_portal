import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { DashboardShell } from "@/components/dashboard-shell";
import { OfficerWorkspace } from "@/components/officer-workspace";
import type { ComplaintListItem } from "@/components/complaint-table";

export default async function OfficerPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");
  if (session.user.role !== "OFFICER") redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  let complaints: ComplaintListItem[] = []; let error = "";
  try { await connectToDatabase(); complaints = await Complaint.find({ assignedOfficer: session.user.id }).sort({ createdAt: -1 }).limit(100).lean() as ComplaintListItem[]; } catch { error = "Unable to load assigned work."; }
  return <DashboardShell user={{ name: session.user.name ?? "Officer", role: session.user.role }}>{error ? <p className="rounded-xl bg-red-50 p-5 text-red-800">{error}</p> : <OfficerWorkspace officerName={session.user.name ?? "Officer"} complaints={complaints} />}</DashboardShell>;
}
