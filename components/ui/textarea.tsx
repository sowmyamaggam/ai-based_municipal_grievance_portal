import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-civic-500 focus:ring-2 focus:ring-civic-100 disabled:bg-slate-50", className)} {...props} />;
}
