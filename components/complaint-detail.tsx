"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, FileText, Image as ImageIcon, MapPin, RefreshCw, Send, Star, UserRound } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComplaintMap } from "@/components/complaint-map";
import { ResolutionEvidenceUpload, type ResolutionAttachment } from "@/components/resolution-evidence-upload";
import { ComplaintStaffControls } from "@/components/complaint-staff-controls";
import { ComplaintTimeline } from "@/components/complaint-timeline";
import { formatDate } from "@/lib/utils";

type Role = "CITIZEN" | "OFFICER" | "ADMIN";
type Detail = any;
const StaffControls = ComplaintStaffControls;

export function ComplaintDetail({ initialComplaint, role }: { initialComplaint: Detail; role: Role }) {
  const [complaint, setComplaint] = useState(initialComplaint);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const id = complaint._id.toString();
  const staff = role !== "CITIZEN";

  async function update(data: Record<string, unknown>) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/complaints/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, remarks }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update report");
      setComplaint(payload.complaint);
      setRemarks("");
      setNotice("Report updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function retryAi() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/complaints/${id}/analyze`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Analysis retry failed");
      const refreshed = await fetch(`/api/complaints/${id}`).then((item) => item.json());
      setComplaint(refreshed.complaint);
      setNotice(payload.analysis.status === "COMPLETED" ? "AI analysis completed." : "AI analysis remains pending; the report is safely stored.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analysis retry failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    if (!rating) {
      setError("Choose a rating first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/complaints/${id}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment: feedback }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save feedback");
      setComplaint(payload.complaint);
      setNotice("Thank you for your feedback.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save feedback");
    } finally {
      setLoading(false);
    }
  }

  const location = complaint.location?.coordinates?.length === 2 ? [{ id, number: complaint.complaintNumber, category: complaint.category, priority: complaint.priority, status: complaint.status, coordinates: complaint.location.coordinates }] : [];

  return <><Link href="/complaints" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-civic-700"><ArrowLeft size={17} /> Back to complaints</Link><section className="mt-5 flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start"><div><p className="text-sm font-bold uppercase tracking-[.14em] text-civic-600">{complaint.complaintNumber}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{complaint.ai?.summary || complaint.category}</h1><p className="mt-2 text-slate-600">Submitted {formatDate(complaint.createdAt)}</p></div><div className="flex flex-wrap gap-2"><PriorityBadge priority={complaint.priority} /><StatusBadge status={complaint.status} /></div></section>{(notice || error) && <div className={`mt-5 flex gap-2 rounded-xl p-4 text-sm font-medium ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}{error || notice}</div>}<div className="mt-7 grid gap-7 xl:grid-cols-[1.3fr_.7fr]"><div className="space-y-7"><Card className="p-5 sm:p-7"><h2 className="text-lg font-extrabold text-ink">Report details</h2><p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{complaint.description}</p>{complaint.address && <p className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><MapPin className="mt-0.5 shrink-0 text-civic-600" size={18} />{complaint.address}</p>}<AttachmentGrid title="Citizen attachments" files={complaint.attachments} /><AttachmentGrid title="Resolution evidence" files={complaint.resolutionEvidence} resolved /></Card><AiAssessment complaint={complaint} staff={staff} loading={loading} retryAi={retryAi} /><Card className="p-5 sm:p-7"><h2 className="text-lg font-extrabold text-ink">Activity timeline</h2><ol className="mt-5 space-y-5 border-l-2 border-slate-200 pl-5">{[...(complaint.history || [])].reverse().map((event: any, index: number) => <li key={event._id || index} className="relative"><span className="absolute -left-[1.83rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-civic-600" /><p className="font-bold text-slate-700">{String(event.action).replaceAll("_", " ")}</p><p className="mt-0.5 text-sm text-slate-500">{event.actorName || "System"} - {formatDate(event.createdAt)}</p>{event.remarks && <p className="mt-1 text-sm text-slate-600">{event.remarks}</p>}</li>)}</ol></Card>{role === "CITIZEN" && ["RESOLVED", "CLOSED"].includes(complaint.status) && !complaint.feedback?.rating && <Card className="p-5 sm:p-7"><h2 className="text-lg font-extrabold text-ink">Rate this resolution</h2><p className="mt-1 text-sm text-slate-500">Your feedback helps municipal teams improve service.</p><div className="mt-4 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)} className="p-1"><Star className={value <= rating ? "fill-sun text-sun" : "text-slate-300"} /></button>)}</div><Textarea className="mt-4" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Optional comments" /><Button type="button" className="mt-3" onClick={submitFeedback} disabled={loading}><Send size={16} /> Submit feedback</Button></Card>}</div><aside className="space-y-7"><Card className="p-5"><h2 className="font-extrabold text-ink">Routing</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-slate-500">Department</dt><dd className="mt-1 font-bold text-slate-700">{complaint.department}</dd></div><div><dt className="text-slate-500">Assigned officer</dt><dd className="mt-1 flex items-center gap-2 font-bold text-slate-700"><UserRound size={16} className="text-civic-600" />{complaint.assignedOfficer?.name || "Awaiting assignment"}</dd></div>{complaint.assignmentStatus && <div><dt className="text-slate-500">Assignment approval</dt><dd className="mt-1 font-bold text-slate-700">{String(complaint.assignmentStatus).toLowerCase().replaceAll("_", " ")}</dd></div>}</dl></Card>{location.length > 0 && <Card className="overflow-hidden p-3"><div className="px-2 pb-3"><h2 className="font-extrabold text-ink">Reported location</h2><p className="text-xs text-slate-500">Visible only to authorized accounts.</p></div><ComplaintMap pins={location} className="h-64 rounded-xl" /></Card>}{complaint.duplicate?.possible && <Card className="border-fuchsia-200 bg-fuchsia-50 p-5"><h2 className="flex items-center gap-2 font-extrabold text-fuchsia-900"><AlertTriangle size={18} /> Possible related reports</h2><p className="mt-2 text-sm leading-6 text-fuchsia-800">A nearby report shares similar signals. Both reports remain separate until staff reviews any link.</p><p className="mt-3 text-sm font-bold text-fuchsia-900">Match confidence: {Math.round((complaint.duplicate.score || 0) * 100)}%</p></Card>}{staff && <StaffControls complaint={complaint} role={role} remarks={remarks} setRemarks={setRemarks} update={update} loading={loading} />}</aside></div></>;
}

function AttachmentGrid({ title, files, resolved = false }: { title: string; files?: any[]; resolved?: boolean }) {
  if (!files?.length) return null;
  return <div className="mt-6"><h3 className="text-sm font-extrabold text-ink">{title}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{files.map((file, index) => <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${resolved ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100" : "border-slate-200 hover:bg-slate-50"}`}>{file.mimeType.startsWith("image/") ? <ImageIcon className={resolved ? "text-emerald-700" : "text-civic-600"} /> : <FileText className={resolved ? "text-emerald-700" : "text-civic-600"} />}<span className={`truncate text-sm font-semibold ${resolved ? "text-emerald-900" : "text-slate-700"}`}>{file.filename}</span></a>)}</div></div>;
}

function AiAssessment({ complaint, staff, loading, retryAi }: { complaint: Detail; staff: boolean; loading: boolean; retryAi: () => Promise<void> }) {
  return <Card className="p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-700"><Bot size={20} /></span><div><h2 className="font-extrabold text-ink">AI assessment</h2><p className="text-sm text-slate-500">Decision support only; authorized staff can correct it.</p></div></div>{complaint.ai?.status === "COMPLETED" ? <div className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Suggested category" value={complaint.category} /><Info label="Suggested department" value={complaint.department} /><Info label="Sentiment" value={complaint.ai.sentiment || "Not assessed"} /><Info label="Confidence" value={complaint.ai.confidence !== undefined ? `${Math.round(complaint.ai.confidence * 100)}%` : "Not available"} /><div className="sm:col-span-2 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Why this was suggested</p><p className="mt-2 text-sm leading-6 text-slate-700">{complaint.ai.reason}</p>{complaint.ai.imageFindings?.length > 0 && <p className="mt-3 text-sm text-slate-600"><strong>Image observations:</strong> {complaint.ai.imageFindings.join(" - ")}</p>}</div></div> : <div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="font-bold text-amber-900">AI analysis {complaint.ai?.status?.toLowerCase() || "pending"}</p><p className="mt-1 text-sm text-amber-800">The report remains available and can be reviewed without AI assistance.</p>{staff && <Button type="button" className="mt-3" variant="outline" onClick={() => void retryAi()} disabled={loading}><RefreshCw size={16} /> Retry analysis</Button>}</div>}</Card>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-700">{value}</p></div>;
}

function LegacyStaffControls({ complaint, role, remarks, setRemarks, update, loading }: { complaint: Detail; role: Role; remarks: string; setRemarks: (value: string) => void; update: (value: Record<string, unknown>) => Promise<void>; loading: boolean }) {
  const [officers, setOfficers] = useState<{ _id: string; name: string; department?: string }[]>([]);
  useEffect(() => {
    if (role === "ADMIN") fetch("/api/users/officers").then((response) => response.ok ? response.json() : { officers: [] }).then((payload) => setOfficers(payload.officers || [])).catch(() => undefined);
  }, [role]);
  const statuses = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "REJECTED", "DUPLICATE", "ESCALATED"];
  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const categories = ["Road Damage", "Garbage", "Drainage", "Sewage", "Streetlight", "Water Supply", "Sanitation", "Flooding", "Infrastructure", "Public Safety", "Other"];
  const resolved = ["RESOLVED", "CLOSED"].includes(complaint.status);
  const awaitingApproval = role === "OFFICER" && complaint.assignmentStatus === "PENDING";
  const relatedOfficers = officers.filter((officer) => officer.department?.trim().toLowerCase() === complaint.department?.trim().toLowerCase());
  const otherOfficers = officers.filter((officer) => !relatedOfficers.includes(officer));

  return <Card className="p-5"><h2 className="font-extrabold text-ink">Officer actions</h2><p className="mt-1 text-xs text-slate-500">Changes are recorded in the report history.</p>{awaitingApproval && <div className="mt-4 rounded-xl border border-civic-200 bg-civic-50 p-4"><p className="font-bold text-civic-900">Accept this assigned work</p><p className="mt-1 text-sm text-civic-800">Confirm that you can handle this complaint before work starts.</p><div className="mt-3 flex gap-2"><Button type="button" onClick={() => void update({ assignmentDecision: "ACCEPTED" })} disabled={loading}>Accept work</Button><Button type="button" variant="outline" onClick={() => void update({ assignmentDecision: "DECLINED" })} disabled={loading}>Decline</Button></div></div>}{role === "ADMIN" && <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">Assigned officer<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={complaint.assignedOfficer?._id || ""} onChange={(event) => void update({ assignedOfficer: event.target.value || null })} disabled={loading}><option value="">Unassigned</option>{relatedOfficers.length > 0 && <optgroup label={`Recommended - ${complaint.department}`}>{relatedOfficers.map((officer) => <option key={officer._id} value={officer._id}>{officer.name}{officer.department ? ` - ${officer.department}` : ""}</option>)}</optgroup>}{otherOfficers.length > 0 && <optgroup label="Other officers - administrator override">{otherOfficers.map((officer) => <option key={officer._id} value={officer._id}>{officer.name}{officer.department ? ` - ${officer.department}` : ""}</option>)}</optgroup>}</select><span className="mt-1 block normal-case tracking-normal text-slate-500">Department officers are recommended; administrators can still assign any active officer.</span></label>}<label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">Status<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={complaint.status} onChange={(event) => void update({ status: event.target.value })} disabled={loading || awaitingApproval}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Priority<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={complaint.priority} onChange={(event) => void update({ priority: event.target.value })} disabled={loading || awaitingApproval}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Category<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={complaint.category} onChange={(event) => void update({ category: event.target.value })} disabled={loading || awaitingApproval}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Department<Input className="mt-1.5" value={complaint.department} disabled={loading || awaitingApproval} onBlur={(event) => { if (event.target.value !== complaint.department) void update({ department: event.target.value }); }} /></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Remarks<Textarea className="mt-1.5 min-h-20" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add context before changing a field..." disabled={loading} /></label>{resolved && <><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Resolution note<Textarea className="mt-1.5 min-h-20" defaultValue={complaint.resolutionRemarks} onBlur={(event) => { if (event.target.value !== complaint.resolutionRemarks) void update({ resolutionRemarks: event.target.value }); }} placeholder="Describe the completed work..." disabled={loading || awaitingApproval} /></label><ResolutionEvidenceUpload evidence={(complaint.resolutionEvidence || []) as ResolutionAttachment[]} onChange={(evidence) => update({ resolutionEvidence: evidence })} disabled={loading || awaitingApproval} /></>}</Card>;
}
