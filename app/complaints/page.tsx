import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { ComplaintTable } from "@/components/complaint-table";
import { Plus } from "lucide-react";

export default async function ComplaintsPage() {
  const session = await auth(); if (!session?.user?.id || !session.user.role) redirect("/login");
  let complaints: any[] = []; let error: string | undefined;
  try { await connectToDatabase(); const query = session.user.role === "CITIZEN" ? { citizen: session.user.id } : session.user.role === "OFFICER" ? { assignedOfficer: session.user.id } : {}; complaints = await Complaint.find(query).sort({ createdAt: -1 }).limit(100).populate("assignedOfficer", "name email department").lean(); } catch (reason) { error = reason instanceof Error ? reason.message : "Could not load reports."; }
  const title = session.user.role === "CITIZEN" ? "My complaints" : session.user.role === "OFFICER" ? "Assigned complaints" : "All complaints";
  return <DashboardShell user={{ name: session.user.name ?? "Portal user", role: session.user.role }}><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">Complaint records</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{title}</h1><p className="mt-2 text-slate-600">Each report remains visible, including those linked to the same underlying issue.</p></div>{session.user.role === "CITIZEN" && <Link href="/complaints/new" className={buttonClass()}><Plus size={18} /> Report an issue</Link>}</section>{error ? <p className="mt-7 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p> : <Card className="mt-7"><ComplaintTable complaints={complaints} emptyText="No reports have been submitted yet." adminMode={session.user.role === "ADMIN"} /></Card>}</DashboardShell>;
}
