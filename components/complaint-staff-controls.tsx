"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResolutionEvidenceUpload, type ResolutionAttachment } from "@/components/resolution-evidence-upload";

type Role = "CITIZEN" | "OFFICER" | "ADMIN";
type Detail = any;
type Officer = { _id: string; name: string; department?: string };

function draftFrom(complaint: Detail) {
  return {
    assignedOfficer: String(complaint.assignedOfficer?._id || ""),
    status: complaint.status || "SUBMITTED",
    priority: complaint.priority || "MEDIUM",
    category: complaint.category || "Other",
    department: complaint.department || "Unassigned",
    resolutionRemarks: complaint.resolutionRemarks || "",
    resolutionEvidence: (complaint.resolutionEvidence || []) as ResolutionAttachment[],
  };
}

export function ComplaintStaffControls({ complaint, role, remarks, setRemarks, update, loading }: { complaint: Detail; role: Role; remarks: string; setRemarks: (value: string) => void; update: (value: Record<string, unknown>) => Promise<void>; loading: boolean }) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [draft, setDraft] = useState(() => draftFrom(complaint));
  const awaitingApproval = role === "OFFICER" && complaint.assignmentStatus === "PENDING";
  const statuses = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "REJECTED", "DUPLICATE", "ESCALATED"];
  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const categories = ["Road Damage", "Garbage", "Drainage", "Sewage", "Streetlight", "Water Supply", "Sanitation", "Flooding", "Infrastructure", "Public Safety", "Other"];

  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch("/api/users/officers").then((response) => response.ok ? response.json() : { officers: [] }).then((payload) => setOfficers(payload.officers || [])).catch(() => setOfficers([]));
  }, [role]);

  useEffect(() => {
    setDraft(draftFrom(complaint));
  }, [complaint._id, complaint.assignedOfficer?._id, complaint.status, complaint.priority, complaint.category, complaint.department, complaint.resolutionRemarks, complaint.resolutionEvidence]);

  const relatedOfficers = useMemo(() => officers.filter((officer) => officer.department?.trim().toLowerCase() === draft.department.trim().toLowerCase()), [draft.department, officers]);
  const otherOfficers = useMemo(() => officers.filter((officer) => !relatedOfficers.includes(officer)), [officers, relatedOfficers]);
  const currentOfficerId = String(complaint.assignedOfficer?._id || "");
  const evidenceChanged = JSON.stringify(draft.resolutionEvidence) !== JSON.stringify(complaint.resolutionEvidence || []);
  const hasChanges = (role === "ADMIN" && draft.assignedOfficer !== currentOfficerId) || draft.status !== complaint.status || draft.priority !== complaint.priority || draft.category !== complaint.category || draft.department !== complaint.department || draft.resolutionRemarks !== (complaint.resolutionRemarks || "") || evidenceChanged;
  const resolutionOpen = ["RESOLVED", "CLOSED"].includes(draft.status);

  async function submitChanges() {
    const changes: Record<string, unknown> = {};
    if (role === "ADMIN" && draft.assignedOfficer !== currentOfficerId) changes.assignedOfficer = draft.assignedOfficer || null;
    if (draft.status !== complaint.status) changes.status = draft.status;
    if (draft.priority !== complaint.priority) changes.priority = draft.priority;
    if (draft.category !== complaint.category) changes.category = draft.category;
    if (draft.department !== complaint.department) changes.department = draft.department;
    if (draft.resolutionRemarks !== (complaint.resolutionRemarks || "")) changes.resolutionRemarks = draft.resolutionRemarks;
    if (evidenceChanged) changes.resolutionEvidence = draft.resolutionEvidence;
    if (Object.keys(changes).length) await update(changes);
  }

  const controlDisabled = loading || awaitingApproval;
  return <Card className="p-5"><h2 className="font-extrabold text-ink">Officer actions</h2><p className="mt-1 text-xs text-slate-500">Review changes first, then submit them together. Every submitted update is recorded in the report history.</p>{awaitingApproval && <div className="mt-4 rounded-xl border border-civic-200 bg-civic-50 p-4"><p className="font-bold text-civic-900">Accept this assigned work</p><p className="mt-1 text-sm text-civic-800">Confirm that you can handle this complaint before starting work.</p><div className="mt-3 flex gap-2"><Button type="button" onClick={() => void update({ assignmentDecision: "ACCEPTED" })} disabled={loading}>Accept work</Button><Button type="button" variant="outline" onClick={() => void update({ assignmentDecision: "DECLINED" })} disabled={loading}>Decline</Button></div></div>}{role === "ADMIN" && <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">Assigned officer<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={draft.assignedOfficer} onChange={(event) => setDraft({ ...draft, assignedOfficer: event.target.value })} disabled={controlDisabled}><option value="">Unassigned</option>{relatedOfficers.length > 0 && <optgroup label={`Recommended - ${draft.department}`}>{relatedOfficers.map((officer) => <option key={officer._id} value={officer._id}>{officer.name}{officer.department ? ` - ${officer.department}` : ""}</option>)}</optgroup>}{otherOfficers.length > 0 && <optgroup label="Other officers - administrator override">{otherOfficers.map((officer) => <option key={officer._id} value={officer._id}>{officer.name}{officer.department ? ` - ${officer.department}` : ""}</option>)}</optgroup>}</select><span className="mt-1 block normal-case tracking-normal text-slate-500">Department officers are recommended; administrators can still assign any active officer.</span></label>}<label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">Status<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} disabled={controlDisabled}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Priority<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} disabled={controlDisabled}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Category<select className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} disabled={controlDisabled}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Department<Input className="mt-1.5" value={draft.department} disabled={controlDisabled} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Remarks<Textarea className="mt-1.5 min-h-20" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add context for this submission..." disabled={loading} /></label>{resolutionOpen && <><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Resolution note<Textarea className="mt-1.5 min-h-20" value={draft.resolutionRemarks} onChange={(event) => setDraft({ ...draft, resolutionRemarks: event.target.value })} placeholder="Describe the completed work..." disabled={controlDisabled} /></label><ResolutionEvidenceUpload evidence={draft.resolutionEvidence} onChange={(resolutionEvidence) => setDraft({ ...draft, resolutionEvidence })} disabled={controlDisabled} /></>}<Button type="button" className="mt-5 w-full" onClick={() => void submitChanges()} disabled={controlDisabled || !hasChanges}>{loading ? "Submitting..." : role === "ADMIN" ? "Submit assignment and changes" : "Submit work update"}</Button>{!hasChanges && !awaitingApproval && <p className="mt-2 text-center text-xs text-slate-500">Make a change before submitting.</p>}</Card>;
}
