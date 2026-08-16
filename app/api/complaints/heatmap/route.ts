import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { z } from "zod";

const heatmapQuerySchema = z.object({
  categories: z.string().optional(),
  priorities: z.string().optional(),
  statuses: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bounds: z.string().optional(), // minLat,maxLat,minLng,maxLng
});

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
    const filter: any = {
      location: { $exists: true },
      "location.coordinates": { $exists: true, $ne: null },
    };

    // Filter by categories
    if (params.categories) {
      const cats = params.categories.split(",").filter(Boolean);
      if (cats.length > 0) {
        filter.category = { $in: cats };
      }
    }

    // Filter by priorities
    if (params.priorities) {
      const prios = params.priorities.split(",").filter(Boolean);
      if (prios.length > 0) {
        filter.priority = { $in: prios };
      }
    }

    // Filter by statuses
    if (params.statuses) {
      const stats = params.statuses.split(",").filter(Boolean);
      if (stats.length > 0) {
        filter.status = { $in: stats };
      }
    }

    // Filter by date range
    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) {
        filter.createdAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        filter.createdAt.$lte = new Date(params.endDate);
      }
    }

    // Filter by geographic bounds
    if (params.bounds) {
      const [minLat, maxLat, minLng, maxLng] = params.bounds
        .split(",")
        .map(Number);
      if (!isNaN(minLat) && !isNaN(maxLat) && !isNaN(minLng) && !isNaN(maxLng)) {
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
        "complaintNumber category priority status createdAt location address citizen"
      )
      .populate("citizen", "name")
      .limit(1000)
      .lean();

    // Transform data for map visualization
    const features = complaints
      .filter((c: any) => c.location?.coordinates && c.location.coordinates.length === 2)
      .map((c: any) => ({
        id: c._id.toString(),
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: c.location.coordinates,
        },
        properties: {
          complaintNumber: c.complaintNumber,
          category: c.category || "Other",
          priority: c.priority || "MEDIUM",
          status: c.status || "SUBMITTED",
          createdAt: c.createdAt,
          address: c.address || "Location provided",
          citizenName: c.citizen?.name || "Anonymous",
        },
      }));

    // Calculate heatmap intensity (density)
    const heatmapData = features.map((f: any) => [
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
  } catch (error) {
    console.error("Heatmap API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load heatmap data" },
      { status: 500 }
    );
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

function groupBy(items: any[], field: string): Record<string, number> {
  return items.reduce((acc: Record<string, number>, item: any) => {
    const key = item[field] || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
