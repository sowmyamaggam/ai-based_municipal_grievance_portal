import { cn, type ComplaintStatus, type Priority } from "@/lib/utils";

const priorityStyles: Record<Priority, string> = { LOW: "bg-slate-100 text-slate-700", MEDIUM: "bg-amber-100 text-amber-800", HIGH: "bg-orange-100 text-orange-800", CRITICAL: "bg-red-100 text-red-800" };
const statusStyles: Record<ComplaintStatus, string> = { SUBMITTED: "bg-blue-100 text-blue-800", ASSIGNED: "bg-indigo-100 text-indigo-800", IN_PROGRESS: "bg-violet-100 text-violet-800", RESOLVED: "bg-emerald-100 text-emerald-800", CLOSED: "bg-slate-100 text-slate-700", REOPENED: "bg-amber-100 text-amber-800", REJECTED: "bg-rose-100 text-rose-800", DUPLICATE: "bg-fuchsia-100 text-fuchsia-800", ESCALATED: "bg-red-100 text-red-800" };

export function PriorityBadge({ priority }: { priority: Priority | string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide", priorityStyles[priority as Priority] ?? priorityStyles.MEDIUM)}>{priority}</span>;
}

export function StatusBadge({ status }: { status: ComplaintStatus | string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", statusStyles[status as ComplaintStatus] ?? statusStyles.SUBMITTED)}>{status.replaceAll("_", " ")}</span>;
}
