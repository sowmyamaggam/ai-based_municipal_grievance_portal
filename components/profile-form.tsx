"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Profile = {
  name: string;
  email: string;
  phone: string;
  role: string;
  department?: string;
};

export function ProfileForm({ profile: initialProfile }: { profile: Profile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update your profile");
      setProfile(payload.profile);
      setName(payload.profile.name);
      setMessage(payload.message || "Profile updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update your profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-7 lg:grid-cols-[1.2fr_.8fr]">
      <Card className="p-5 sm:p-7">
        <h2 className="text-lg font-extrabold text-ink">Personal details</h2>
        <p className="mt-1 text-sm text-slate-500">Keep your contact information current so municipal staff can follow up where appropriate.</p>
        <form className="mt-6 space-y-4" onSubmit={save}>
          <label className="block text-sm font-bold text-slate-700">Full name<Input className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
          <label className="block text-sm font-bold text-slate-700">Email address<Input className="mt-1.5 bg-slate-50" type="email" value={profile.email} readOnly aria-readonly="true" /></label>
          <p className="-mt-2 text-xs text-slate-500">Your email is used for secure sign-in. Contact an administrator if it must change.</p>
          <label className="block text-sm font-bold text-slate-700">Mobile number<Input className="mt-1.5 bg-slate-50" value={profile.phone} readOnly aria-readonly="true" /></label>
          <p className="-mt-2 text-xs text-slate-500">Your mobile number is kept for municipal follow-up.</p>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </form>
        {(message || error) && <p role={error ? "alert" : "status"} className={`mt-5 flex gap-2 rounded-xl p-4 text-sm font-medium ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{error ? <ShieldCheck size={18} /> : <CheckCircle2 size={18} />}{error || message}</p>}
      </Card>
      <Card className="h-fit p-5">
        <h2 className="font-extrabold text-ink">Account access</h2>
        <dl className="mt-4 space-y-4 text-sm"><div><dt className="text-slate-500">Role</dt><dd className="mt-1 font-bold text-slate-700">{profile.role.toLowerCase()}</dd></div>{profile.department && <div><dt className="text-slate-500">Department</dt><dd className="mt-1 font-bold text-slate-700">{profile.department}</dd></div>}</dl>
        <p className="mt-5 rounded-xl bg-civic-50 p-3 text-xs leading-5 text-civic-800">Your role, department, complaints, and location data are protected on the server. This page cannot change access permissions.</p>
      </Card>
    </div>
  );
}
