"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface HeatmapMarker {
  id: string;
  complaintNumber: string;
  category: string;
  priority: string;
  status: string;
  coordinates: [number, number];
  address?: string;
  citizenName?: string;
  createdAt: string;
}

interface HeatmapStats {
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

export function ComplaintHeatmap() {
  const [markers, setMarkers] = useState<HeatmapMarker[]>([]);
  const [stats, setStats] = useState<HeatmapStats>({
    total: 0,
    byCategory: {},
    byPriority: {},
    byStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetchHeatmapData();
  }, [selectedCategories, selectedPriorities, selectedStatuses, startDate, endDate]);

  async function fetchHeatmapData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedCategories.length > 0) {
        params.append("categories", selectedCategories.join(","));
      }
      if (selectedPriorities.length > 0) {
        params.append("priorities", selectedPriorities.join(","));
      }
      if (selectedStatuses.length > 0) {
        params.append("statuses", selectedStatuses.join(","));
      }
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/complaints/heatmap?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch heatmap data");

      const data = await response.json();

      const transformed: HeatmapMarker[] = data.complaints.features.map(
        (feature: any) => ({
          id: feature.id,
          complaintNumber: feature.properties.complaintNumber,
          category: feature.properties.category,
          priority: feature.properties.priority,
          status: feature.properties.status,
          coordinates: feature.geometry.coordinates as [number, number],
          address: feature.properties.address,
          citizenName: feature.properties.citizenName,
          createdAt: feature.properties.createdAt,
        })
      );

      setMarkers(transformed);
      setStats(data.statistics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load map");
      console.error("Heatmap error:", err);
    } finally {
      setLoading(false);
    }
  }

  const getPriorityIntensity = (priority: string): number => {
    switch (priority) {
      case "CRITICAL":
        return 1.0;
      case "HIGH":
        return 0.75;
      case "MEDIUM":
        return 0.5;
      case "LOW":
        return 0.25;
      default:
        return 0.5;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "CRITICAL":
        return "#dc2626";
      case "HIGH":
        return "#f97316";
      case "MEDIUM":
        return "#eab308";
      case "LOW":
        return "#22c55e";
      default:
        return "#6b7280";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "#10b981";
      case "IN_PROGRESS":
      case "ASSIGNED":
        return "#3b82f6";
      case "SUBMITTED":
        return "#8b5cf6";
      case "REJECTED":
      case "DUPLICATE":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const categories = Object.keys(stats.byCategory);
  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const statuses = Object.keys(stats.byStatus);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Error loading heatmap: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="mb-4 font-semibold">Filters</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Categories
            </label>
            <div className="mt-2 space-y-2">
              {categories.map((cat) => (
                <label key={cat} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories([...selectedCategories, cat]);
                      } else {
                        setSelectedCategories(
                          selectedCategories.filter((c) => c !== cat)
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {cat} ({stats.byCategory[cat]})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <div className="mt-2 space-y-2">
              {priorities.map((pri) => (
                <label key={pri} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedPriorities.includes(pri)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPriorities([...selectedPriorities, pri]);
                      } else {
                        setSelectedPriorities(
                          selectedPriorities.filter((p) => p !== pri)
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {pri} ({stats.byPriority[pri] || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <div className="mt-2 space-y-2">
              {statuses.map((stat) => (
                <label key={stat} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(stat)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatuses([...selectedStatuses, stat]);
                      } else {
                        setSelectedStatuses(
                          selectedStatuses.filter((s) => s !== stat)
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {stat} ({stats.byStatus[stat] || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map and Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Map */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="rounded-lg border bg-gray-50 p-8 text-center">
              <p className="text-gray-600">Loading map data...</p>
            </div>
          ) : markers.length > 0 ? (
            <div className="rounded-lg border shadow-sm" style={{ height: "500px" }}>
              <MapContainer
                center={[markers[0]?.coordinates[1] || 0, markers[0]?.coordinates[0] || 0]}
                zoom={13}
                style={{ height: "100%", borderRadius: "0.5rem" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {markers.map((marker) => (
                  <CircleMarker
                    key={marker.id}
                    center={[marker.coordinates[1], marker.coordinates[0]]}
                    radius={getPriorityIntensity(marker.priority) * 10}
                    fillColor={getPriorityColor(marker.priority)}
                    fillOpacity={0.7}
                    weight={2}
                    opacity={1}
                    color={getStatusColor(marker.status)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{marker.complaintNumber}</p>
                        <p className="text-gray-600">{marker.category}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(marker.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span
                            className="rounded px-2 py-1 text-xs text-white"
                            style={{ backgroundColor: getPriorityColor(marker.priority) }}
                          >
                            {marker.priority}
                          </span>
                          <span
                            className="rounded px-2 py-1 text-xs text-white"
                            style={{ backgroundColor: getStatusColor(marker.status) }}
                          >
                            {marker.status}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="rounded-lg border bg-gray-50 p-8 text-center">
              <p className="text-gray-600">No complaints with locations found</p>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="space-y-4">
          {/* Total Complaints */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">Total Complaints</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>

          {/* By Priority */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">By Priority</p>
            <div className="space-y-2">
              {priorities.map((pri) => (
                <div key={pri} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: getPriorityColor(pri) }}
                    ></span>
                    {pri}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {stats.byPriority[pri] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* By Status */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">By Status</p>
            <div className="space-y-2">
              {statuses.slice(0, 4).map((stat) => (
                <div key={stat} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{stat}</span>
                  <span className="font-semibold text-gray-700">
                    {stats.byStatus[stat] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
