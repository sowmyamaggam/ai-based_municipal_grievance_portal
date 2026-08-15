"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, CheckCheck, CheckCircle2, LoaderCircle, X } from "lucide-react";

type Notification = {
  _id: string;
  complaint?: string;
  kind?: "GENERAL" | "STATUS_UPDATED" | "COMPLAINT_RESOLVED";
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
};

const seenResolutionStorageKey = "civicguard-seen-resolution-notifications";

function notificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolutionAlert, setResolutionAlert] = useState<Notification | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const seenResolutionIds = useRef(new Set<string>());
  const audioContext = useRef<AudioContext | null>(null);
  const audioArmed = useRef(false);
  const pendingResolutionSound = useRef(false);

  async function armResolutionSound() {
    try {
      let context = audioContext.current;
      if (!context || context.state === "closed") {
        context = new window.AudioContext();
        audioContext.current = context;
      }
      if (context.state === "suspended") await context.resume();
      if (context.state !== "running") return;

      const gain = context.createGain();
      const oscillator = context.createOscillator();
      gain.gain.setValueAtTime(0.00001, context.currentTime);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.01);
      audioArmed.current = true;
      if (pendingResolutionSound.current) {
        pendingResolutionSound.current = false;
        playResolutionSound();
      }
    } catch {
      // The popup remains visible even if a device/browser refuses audio.
    }
  }

  function playResolutionSound() {
    const context = audioContext.current;
    if (!audioArmed.current || !context || context.state !== "running") {
      pendingResolutionSound.current = true;
      return;
    }
    try {
      const gain = context.createGain();
      const oscillator = context.createOscillator();
      const now = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, now);
      oscillator.frequency.setValueAtTime(880, now + 0.15);
      oscillator.frequency.setValueAtTime(1047, now + 0.3);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.setValueAtTime(0.2, now + 0.32);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.64);
    } catch {
      pendingResolutionSound.current = true;
    }
  }

  function rememberResolution(id: string) {
    seenResolutionIds.current.add(id);
    try {
      sessionStorage.setItem(seenResolutionStorageKey, JSON.stringify([...seenResolutionIds.current].slice(-50)));
    } catch {
      // The popup still works if storage is unavailable.
    }
  }

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      const payload = await response.json();
      if (!response.ok) return;
      const notifications = payload.notifications || [];
      setItems(notifications);
      const newlyResolved = notifications.find((item: Notification) => item.kind === "COMPLAINT_RESOLVED" && !item.readAt && !seenResolutionIds.current.has(item._id));
      if (newlyResolved) {
        rememberResolution(newlyResolved._id);
        setResolutionAlert(newlyResolved);
        playResolutionSound();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPortalReady(true);
    const unlockSound = () => void armResolutionSound();
    document.addEventListener("pointerdown", unlockSound, { once: true });
    document.addEventListener("keydown", unlockSound, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlockSound);
      document.removeEventListener("keydown", unlockSound);
      void audioContext.current?.close();
    };
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(seenResolutionStorageKey) || "[]");
      if (Array.isArray(stored)) seenResolutionIds.current = new Set(stored.filter((id): id is string => typeof id === "string"));
    } catch {
      // Continue with an empty session-only set.
    }
    void load();
    const refresh = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(refresh);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function markAllRead() {
    const response = await fetch("/api/notifications", { method: "PATCH" });
    if (response.ok) setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  }

  const unread = items.filter((item) => !item.readAt).length;
  const resolutionModal = portalReady && resolutionAlert ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6" role="presentation">
      <section className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-emerald-200 bg-white shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="resolved-title" aria-describedby="resolved-message">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-7 text-center text-white">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/20 ring-4 ring-white/20"><CheckCircle2 size={36} /></span>
          <p className="mt-4 text-xs font-extrabold uppercase tracking-[.2em] text-white/80">Resolution update</p>
          <h2 id="resolved-title" className="mt-2 text-2xl font-extrabold">Your issue is resolved</h2>
        </div>
        <div className="p-6 text-center">
          <p id="resolved-message" className="text-base leading-7 text-slate-700">{resolutionAlert.message}</p>
          <p className="mt-2 text-sm text-slate-500">The municipal team has completed work on this complaint.</p>
          <Link href={resolutionAlert.complaint ? `/complaints/${resolutionAlert.complaint}` : "/complaints"} onClick={() => setResolutionAlert(null)} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-civic-600 px-4 text-sm font-bold text-white transition hover:bg-civic-700">View resolution</Link>
          <button type="button" onClick={() => setResolutionAlert(null)} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800"><X size={16} /> Dismiss</button>
        </div>
      </section>
    </div>,
    document.body
  ) : null;

  return <div className="relative"><button type="button" onClick={() => setOpen((value) => !value)} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications" aria-expanded={open}><Bell size={20} />{unread > 0 && <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</button>{open && <section className="absolute right-0 top-12 z-30 w-[min(23rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" aria-label="Notifications"><header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="font-extrabold text-ink">Notifications</h2><p className="text-xs text-slate-500">Updates about your reports</p></div>{unread > 0 && <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-civic-700 hover:bg-civic-50"><CheckCheck size={15} /> Mark read</button>}</header><div className="max-h-96 overflow-y-auto">{loading ? <div className="grid min-h-32 place-items-center text-sm text-slate-500"><LoaderCircle className="animate-spin" size={19} /></div> : items.length ? items.map((item) => <Link key={item._id} href={item.complaint ? `/complaints/${item.complaint}` : "/complaints"} onClick={() => setOpen(false)} className={`block border-b border-slate-100 px-4 py-3 last:border-none hover:bg-slate-50 ${item.readAt ? "" : "bg-civic-50/60"}`}><p className="text-sm font-bold text-slate-800">{item.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p><p className="mt-1 text-xs text-slate-400">{notificationDate(item.createdAt)}</p></Link>) : <p className="p-6 text-center text-sm text-slate-500">No notifications yet.</p>}</div></section>}{resolutionModal}</div>;
}
