"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type Pin = { id: string; number: string; category: string; priority: string; status: string; coordinates: [number, number] };
const icon = L.divIcon({ className: "", html: '<span style="display:block;width:15px;height:15px;border-radius:999px;background:#087d73;border:3px solid white;box-shadow:0 1px 4px #475569"></span>', iconSize: [15, 15], iconAnchor: [7, 7] });
export default function LeafletMap({ pins, className }: { pins: Pin[]; className?: string }) {
  const centre: [number, number] = pins.length ? [pins[0].coordinates[1], pins[0].coordinates[0]] : [20.5937, 78.9629];
  return <MapContainer center={centre} zoom={pins.length ? 14 : 5} scrollWheelZoom className={className ?? "h-80 rounded-2xl"}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{pins.map((pin) => <Marker key={pin.id} position={[pin.coordinates[1], pin.coordinates[0]]} icon={icon}><Popup><strong>{pin.number}</strong><br />{pin.category}<br />{pin.priority} · {pin.status}</Popup></Marker>)}</MapContainer>;
}
