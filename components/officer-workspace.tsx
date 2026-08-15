import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock3, MapPinned } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { ComplaintMap } from "@/components/complaint-map";
import { ComplaintTable, type ComplaintListItem } from "@/components/complaint-table";
import { ReportDownload } from "@/components/report-download";

export function OfficerWorkspace({ officerName, complaints }: { officerName: string; complaints: ComplaintListItem[] }) {
  const active = complaints.filter((item) => !["RESOLVED", "CLOSED", "REJECTED"].includes(item.status));
  const critical = active.filter((item) => item.priority === "CRITICAL");
  const inProgress = active.filter((item) => item.status === "IN_PROGRESS");
  const resolved = complaints.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status));
  const priorityQueue = [...active].sort((first, second) => {
    const weight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return weight[second.priority] - weight[first.priority] || new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
  });
  const pins = active.filter((item) => item.location?.coordinates?.length === 2).map((item) => ({ id: item._id.toString(), number: item.complaintNumber, category: item.category, priority: item.priority, status: item.status, coordinates: item.location!.coordinates as [number, number] }));

  return <>
    <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-civic-600">Officer command centre</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Your assigned work, {officerName.split(" ")[0]}.</h1><p className="mt-2 text-slate-600">Review urgent reports, update their lifecycle, and leave an accountable resolution trail.</p></div><Link href="/complaints" className={buttonClass("outline")}>View all assignments <ArrowRight size={17} /></Link></section>
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<ClipboardCheck />} label="Assigned to you" value={complaints.length} color="civic" /><Metric icon={<AlertTriangle />} label="Critical now" value={critical.length} color="red" /><Metric icon={<Clock3 />} label="In progress" value={inProgress.length} color="blue" /><Metric icon={<CheckCircle2 />} label="Resolved" value={resolved.length} color="green" /></section>
    <ReportDownload role="OFFICER" />
    {critical.length > 0 && <Card className="mt-7 border-red-200 bg-red-50 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 font-extrabold text-red-900"><AlertTriangle size={19} /> {critical.length} critical report{critical.length === 1 ? "" : "s"} need attention</h2><p className="mt-1 text-sm text-red-800">Review these immediately and record escalation or action in the report timeline.</p></div><Link href={`/complaints/${critical[0]._id.toString()}`} className={buttonClass("danger")}>Open critical report</Link></div></Card>}
    <section className="mt-7 grid gap-7 xl:grid-cols-[1.35fr_.65fr]"><Card><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-extrabold text-ink">Prioritized work queue</h2><p className="mt-1 text-sm text-slate-500">Ordered by urgency, then report age.</p></div><Link href="/complaints" className="text-sm font-bold text-civic-700 hover:underline">All assignments</Link></div><ComplaintTable complaints={priorityQueue.slice(0, 8)} emptyText="An administrator must assign reports to you before they appear here." /></Card><Card className="p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-700"><MapPinned size={20} /></span><div><h2 className="font-extrabold text-ink">Active locations</h2><p className="text-sm text-slate-500">GPS markers for your assignments.</p></div></div><div className="mt-5">{pins.length ? <ComplaintMap pins={pins} /> : <div className="grid h-80 place-items-center rounded-2xl bg-slate-100 p-6 text-center"><MapPinned className="mb-3 text-slate-400" /><p className="font-bold text-slate-600">No assigned GPS reports</p><p className="mt-1 text-sm text-slate-500">Locations appear when citizens opt to include them.</p></div>}</div></Card></section>
  </>;
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: "civic" | "red" | "blue" | "green" }) {
  const styles = { civic: "bg-civic-50 text-civic-700", red: "bg-red-50 text-red-700", blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700" };
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${styles[color]}`}>{icon}</span></div></Card>;
}
