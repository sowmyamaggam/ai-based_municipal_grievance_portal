"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Clock3, MapPinned, Star, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { ComplaintMap } from "@/components/complaint-map";
import { ReportDownload } from "@/components/report-download";

type Analytics = {
  total: number;
  statuses: { _id: string; count: number }[];
  priorities: { _id: string; count: number }[];
  categories: { _id: string; count: number }[];
  departments: { _id: string; count: number; resolved: number }[];
  trend: { _id: { year: number; month: number }; complaints: number }[];
  averageResolutionHours: number;
  satisfaction: { rating: number; count: number };
  officers: number;
  hotspots: { _id: { longitude: number; latitude: number; category: string }; count: number; complaints: string[] }[];
  recentFeedback: { _id: string; complaintNumber: string; category: string; department: string; feedback: { rating: number; comment?: string; submittedAt?: string }; citizen?: { name?: string }; assignedOfficer?: { name?: string } }[];
};

const palette = ["#087d73", "#f5b642", "#4f46e5", "#e05d44", "#0f766e", "#7c3aed"];

export function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load analytics");
        return payload;
      })
      .then(setData)
      .catch((reason) => setError(reason.message));
  }, []);

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!data) return <div className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">Loading city analytics...</div>;

  const status = data.statuses.map((item) => ({ name: item._id.replaceAll("_", " "), value: item.count }));
  const priority = data.priorities.map((item) => ({ name: item._id, value: item.count }));
  const trend = data.trend.map((item) => ({ label: new Date(item._id.year, item._id.month - 1).toLocaleDateString("en-IN", { month: "short" }), complaints: item.complaints }));
  const pins = data.hotspots.map((item, index) => ({ id: `${index}`, number: item.complaints.join(", "), category: `${item._id.category} hotspot (${item.count})`, priority: "HIGH", status: "OPEN", coordinates: [item._id.longitude, item._id.latitude] as [number, number] }));
  const unresolved = data.total - (data.statuses.find((item) => item._id === "RESOLVED")?.count ?? 0) - (data.statuses.find((item) => item._id === "CLOSED")?.count ?? 0);

  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total complaints" value={data.total} icon={<BarChart3 />} tone="civic" />
      <Metric label="Active officers" value={data.officers} icon={<Users />} tone="blue" />
      <Metric label="Avg. resolution" value={data.averageResolutionHours ? `${data.averageResolutionHours}h` : "-"} icon={<Clock3 />} tone="amber" />
      <Metric label="Satisfaction" value={data.satisfaction.count ? `${data.satisfaction.rating.toFixed(1)}/5` : "-"} icon={<Star />} tone="green" />
    </section>

    <ReportDownload role="ADMIN" />

    <section className="mt-7 grid gap-7 xl:grid-cols-2">
      <ChartCard title="Complaint volume" subtitle="New reports in the last six months"><ResponsiveContainer width="100%" height={270}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="complaints" stroke="#087d73" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></ChartCard>
      <ChartCard title="By category" subtitle="Reported civic issues"><ResponsiveContainer width="100%" height={270}><BarChart data={data.categories.map((item) => ({ name: item._id, count: item.count }))} layout="vertical" margin={{ left: 15 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis width={104} type="category" dataKey="name" tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#087d73" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Status distribution" subtitle="Current lifecycle state"><ResponsiveContainer width="100%" height={270}><PieChart><Pie data={status} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>{status.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Priority distribution" subtitle="Safety and service urgency"><ResponsiveContainer width="100%" height={270}><BarChart data={priority}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{priority.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
    </section>

    <section className="mt-7 grid gap-7 xl:grid-cols-[1.1fr_.9fr]">
      <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-extrabold text-ink">Department performance</h2><p className="mt-1 text-sm text-slate-500">Total reports and resolved reports by department.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Department</th><th className="px-5 py-3">Reports</th><th className="px-5 py-3">Resolved</th><th className="px-5 py-3">Rate</th></tr></thead><tbody>{data.departments.map((department) => <tr key={department._id} className="border-t border-slate-100"><td className="px-5 py-3 font-bold text-slate-700">{department._id}</td><td className="px-5 py-3">{department.count}</td><td className="px-5 py-3">{department.resolved}</td><td className="px-5 py-3 font-semibold text-civic-700">{department.count ? Math.round(department.resolved / department.count * 100) : 0}%</td></tr>)}</tbody></table></div></Card>
      <Card className="p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700"><AlertTriangle size={20} /></span><div><h2 className="font-extrabold text-ink">Attention signals</h2><p className="mt-1 text-sm text-slate-500">Actionable totals drawn from live reports.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><Signal label="Critical" value={data.priorities.find((item) => item._id === "CRITICAL")?.count ?? 0} /><Signal label="Unresolved" value={unresolved} /><Signal label="Feedback received" value={data.satisfaction.count} /><Signal label="Hotspots" value={data.hotspots.length} /></div></Card>
    </section>

    <Card className="mt-7 overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-extrabold text-ink">Recent citizen feedback</h2><p className="mt-1 text-sm text-slate-500">Resolution ratings and comments submitted by citizens.</p></div>{data.recentFeedback.length ? <div className="divide-y divide-slate-100">{data.recentFeedback.map((item) => <div key={item._id} className="px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/complaints/${item._id}`} className="font-bold text-civic-700 hover:underline">{item.complaintNumber}</Link><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{item.feedback.rating}/5</span></div><p className="mt-1 text-sm text-slate-500">{item.category} - {item.department}{item.assignedOfficer?.name ? ` - Officer: ${item.assignedOfficer.name}` : ""}</p>{item.feedback.comment && <p className="mt-2 text-sm leading-6 text-slate-700">{item.feedback.comment}</p>}<p className="mt-2 text-xs text-slate-400">Citizen: {item.citizen?.name || "Citizen"}{item.feedback.submittedAt ? ` - ${new Date(item.feedback.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p></div>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No citizen feedback has been received yet.</p>}</Card>

    <Card className="mt-7 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-700"><MapPinned size={20} /></span><div><h2 className="font-extrabold text-ink">Recurring issue hotspots</h2><p className="text-sm text-slate-500">Clusters with two or more reports, based on rounded GPS points.</p></div></div><div className="mt-5">{pins.length ? <ComplaintMap pins={pins} /> : <div className="grid h-80 place-items-center rounded-xl bg-slate-100 text-center text-sm text-slate-500">No recurring GPS clusters have been identified yet.</div>}</div></Card>
  </>;
}

function Metric({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: string }) {
  const colors: Record<string, string> = { civic: "bg-civic-50 text-civic-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", green: "bg-emerald-50 text-emerald-700" };
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}>{icon}</span></div></Card>;
}

function Signal({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-ink">{value}</p></div>;
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <Card className="p-5"><h2 className="font-extrabold text-ink">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p><div className="mt-5">{children}</div></Card>;
}
