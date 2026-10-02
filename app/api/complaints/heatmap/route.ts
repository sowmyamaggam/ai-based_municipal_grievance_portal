import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { z } from "zod";

const heatmapQuerySchema = z.object({
  categories: z.string().max(500).optional(),
  priorities: z.string().max(100).optional(),
  statuses: z.string().max(200).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bounds: z.string().max(120).optional(), // minLat,maxLat,minLng,maxLng
}).strict();

const categories = ["Road Damage", "Garbage", "Drainage", "Sewage", "Streetlight", "Water Supply", "Sanitation", "Flooding", "Infrastructure", "Public Safety", "Other"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statuses = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "REJECTED", "DUPLICATE", "ESCALATED"];
type HeatmapComplaint = { _id: { toString(): string }; complaintNumber?: string; category?: string; priority?: string; status?: string; createdAt?: Date; address?: string; location?: { coordinates?: number[] } };

function selectedValues(value: string | undefined, allowed: string[]) {
  if (!value) return [];
  return [...new Set(value.split(",").map((item) => item.trim()).filter((item) => allowed.includes(item)))];
}

export async function GET(request: Request) {
  const access = await requireUser(["ADMIN", "OFFICER"]);
  if ("error" in access) return access.error;

  try {
    const url = new URL(request.url);
    const params = heatmapQuerySchema.parse({
      categories: url.searchParams.get("categories") || undefined,
      priorities: url.searchParams.get("priorities") || undefined,
      statuses: url.searchParams.get("statuses") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      bounds: url.searchParams.get("bounds") || undefined,
    });

    await connectToDatabase();

    // Build filter query
    const filter: Record<string, unknown> = {
      location: { $exists: true },
      "location.coordinates": { $exists: true, $ne: null },
    };
    if (access.user.role === "OFFICER") filter.assignedOfficer = access.user.id;

    // Filter by categories
    if (params.categories) {
      const cats = selectedValues(params.categories, categories);
      if (cats.length > 0) {
        filter.category = { $in: cats };
      }
    }

    // Filter by priorities
    if (params.priorities) {
      const prios = selectedValues(params.priorities, priorities);
      if (prios.length > 0) {
        filter.priority = { $in: prios };
      }
    }

    // Filter by statuses
    if (params.statuses) {
      const stats = selectedValues(params.statuses, statuses);
      if (stats.length > 0) {
        filter.status = { $in: stats };
      }
    }

    // Filter by date range
    if (params.startDate || params.endDate) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (params.startDate) dateFilter.$gte = new Date(`${params.startDate}T00:00:00.000Z`);
      if (params.endDate) dateFilter.$lte = new Date(`${params.endDate}T23:59:59.999Z`);
      if ((dateFilter.$gte && Number.isNaN(dateFilter.$gte.getTime())) || (dateFilter.$lte && Number.isNaN(dateFilter.$lte.getTime()))) return NextResponse.json({ error: "Use valid dates in YYYY-MM-DD format." }, { status: 400 });
      if (dateFilter.$gte && dateFilter.$lte && dateFilter.$gte > dateFilter.$lte) return NextResponse.json({ error: "The start date must be before the end date." }, { status: 400 });
      filter.createdAt = dateFilter;
    }

    // Filter by geographic bounds
    if (params.bounds) {
      const bounds = params.bounds.split(",").map(Number);
      const [minLat, maxLat, minLng, maxLng] = bounds;
      if (bounds.length === 4 && [minLat, maxLat, minLng, maxLng].every(Number.isFinite) && minLat >= -90 && maxLat <= 90 && minLng >= -180 && maxLng <= 180 && minLat <= maxLat && minLng <= maxLng) {
        filter.location = {
          $geoWithin: {
            $box: [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
          },
        };
      }
    }

    // Fetch complaints with location data
    const complaints = await Complaint.find(filter)
      .select(
        "complaintNumber category priority status createdAt location address"
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean() as HeatmapComplaint[];

    // Transform data for map visualization
    const features = complaints
      .filter((c) => c.location?.coordinates && c.location.coordinates.length === 2)
      .map((c) => {
        const coordinates = c.location?.coordinates || [];
        return {
        id: c._id.toString(),
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates,
        },
        properties: {
          complaintNumber: c.complaintNumber,
          category: c.category || "Other",
          priority: c.priority || "MEDIUM",
          status: c.status || "SUBMITTED",
          createdAt: c.createdAt,
          address: c.address || "Location provided",
        },
        };
      });

    // Calculate heatmap intensity (density)
    const heatmapData = features.map((f) => [
      ...f.geometry.coordinates,
      getPriorityIntensity(f.properties.priority),
    ]);

    return NextResponse.json({
      complaints: {
        type: "FeatureCollection",
        features,
      },
      heatmapData,
      statistics: {
        total: complaints.length,
        byCategory: groupBy(complaints, "category"),
        byPriority: groupBy(complaints, "priority"),
        byStatus: groupBy(complaints, "status"),
      },
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function getPriorityIntensity(priority: string): number {
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
}

function groupBy(items: HeatmapComplaint[], field: "category" | "priority" | "status"): Record<string, number> {
  return items.reduce((acc: Record<string, number>, item) => {
    const key = item[field] || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
