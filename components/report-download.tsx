"use client";

/* eslint-disable react/no-unescaped-entities */
import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Officer = { _id: string; name: string; department?: string };

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ReportDownload({ role }: { role: "OFFICER" | "ADMIN" }) {
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return isoDate(date);
  });
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [scope, setScope] = useState<"overall" | "officer">(role === "ADMIN" ? "overall" : "officer");
  const [officerId, setOfficerId] = useState("");
  const [officers, setOfficers] = useState<Officer[]>([]);

  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch("/api/users/officers")
      .then((response) => response.ok ? response.json() : { officers: [] })
      .then((payload) => setOfficers(payload.officers || []))
      .catch(() => setOfficers([]));
  }, [role]);

  const href = useMemo(() => {
    const search = new URLSearchParams({ scope, from, to });
    if (role === "ADMIN" && scope === "officer" && officerId) search.set("officerId", officerId);
    return `/api/reports/pdf?${search.toString()}`;
  }, [from, officerId, role, scope, to]);
  const canDownload = Boolean(from && to && from <= to && (role === "OFFICER" || scope === "overall" || officerId));

  return <Card className="mt-7 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-700"><FileBarChart size={20} /></span><div><h2 className="font-extrabold text-ink">PDF work report</h2><p className="mt-1 text-sm text-slate-500">Download complaints created within a selected period, including status, resolution notes, and feedback.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">From<input className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label><label className="text-xs font-bold uppercase tracking-wide text-slate-500">To<input className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>{role === "ADMIN" && <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Report type<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700" value={scope} onChange={(event) => setScope(event.target.value as "overall" | "officer")}><option value="overall">Overall municipal work</option><option value="officer">One officer's work</option></select></label>}{role === "ADMIN" && scope === "officer" && <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Officer<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700" value={officerId} onChange={(event) => setOfficerId(event.target.value)}><option value="">Select officer</option>{officers.map((officer) => <option key={officer._id} value={officer._id}>{officer.name}{officer.department ? ` - ${officer.department}` : ""}</option>)}</select></label>}</div>{from && to && from > to && <p className="mt-3 text-sm font-medium text-red-700">The start date must be before the end date.</p>}<a href={canDownload ? href : undefined} aria-disabled={!canDownload} className={`${buttonClass("primary", "mt-5")}${canDownload ? "" : " pointer-events-none opacity-50"}`}><Download size={17} /> Download PDF</a></Card>;
}
