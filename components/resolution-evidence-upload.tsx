"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ResolutionAttachment = { url: string; filename: string; mimeType: "image/jpeg" | "image/png" | "application/pdf"; size: number };

export function ResolutionEvidenceUpload({ evidence, onChange, disabled }: { evidence: ResolutionAttachment[]; onChange: (evidence: ResolutionAttachment[]) => Promise<void> | void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length || disabled) return;
    if (evidence.length + files.length > 6) {
      setError("You can attach up to six resolution files.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await Promise.all(Array.from(files).map(async (file) => {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/uploads", { method: "POST", body: form });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Could not upload ${file.name}`);
        return payload as ResolutionAttachment;
      }));
      await onChange([...evidence, ...uploaded]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload resolution evidence.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <div className="mt-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Resolution evidence</p><Button type="button" variant="outline" className="min-h-9 px-3" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>{uploading ? <LoaderCircle className="animate-spin" size={15} /> : <ImagePlus size={15} />}{uploading ? "Uploading" : "Add files"}</Button><input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={(event) => upload(event.target.files)} /></div><p className="mt-1 text-xs text-slate-500">JPG, PNG, or PDF. Add photos or documents that confirm the completed work.</p>{error && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{error}</p>}{evidence.length > 0 && <ul className="mt-3 space-y-2">{evidence.map((file, index) => <li key={`${file.url}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"><span className="text-civic-700">{file.mimeType === "application/pdf" ? <FileText size={16} /> : <ImagePlus size={16} />}</span><a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-semibold text-civic-700 hover:underline">{file.filename}</a><button type="button" onClick={() => void onChange(evidence.filter((_, itemIndex) => itemIndex !== index))} disabled={disabled || uploading} className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600" aria-label={`Remove ${file.filename}`}><X size={15} /></button></li>)}</ul>}</div>;
}
