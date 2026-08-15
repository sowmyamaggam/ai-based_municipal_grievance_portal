"use client";

import dynamic from "next/dynamic";

type Pin = { id: string; number: string; category: string; priority: string; status: string; coordinates: [number, number] };
const Map = dynamic(() => import("@/components/leaflet-map"), { ssr: false, loading: () => <div className="grid h-80 place-items-center rounded-2xl bg-slate-100 text-sm text-slate-500">Loading map…</div> });
export function ComplaintMap({ pins, className }: { pins: Pin[]; className?: string }) { return <Map pins={pins} className={className} />; }
