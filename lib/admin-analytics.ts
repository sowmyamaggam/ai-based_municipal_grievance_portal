import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { User } from "@/models/User";

export type AdminAnalytics = {
  total: number;
  statuses: { _id: string; count: number }[];
  priorities: { _id: string; count: number }[];
  categories: { _id: string; count: number }[];
  departments: { _id: string; count: number; resolved: number }[];
  trend: { _id: { year: number; month: number }; complaints: number }[];
  averageResolutionHours: number;
  satisfaction: { rating: number; count: number };
  officers: number;
  hotspots: { _id: { longitude: number; latitude: number; category: string }; count: number; complaints: string[] }[];
  recentFeedback: {
    _id: string;
    complaintNumber: string;
    category: string;
    department: string;
    feedback: { rating: number; comment?: string; submittedAt?: string | Date };
    citizen?: { name?: string };
    assignedOfficer?: { name?: string };
  }[];
};

type AnalyticsFacets = Omit<AdminAnalytics, "officers" | "recentFeedback"> & {
  total: { count: number }[];
  resolvedTime: { value: number }[];
  satisfaction: { rating: number; count: number }[];
};

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  await connectToDatabase();

  const [facets, officers, recentFeedback] = await Promise.all([
    Complaint.aggregate<AnalyticsFacets>([
      {
        $facet: {
          total: [{ $count: "count" }],
          statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          priorities: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
          categories: [{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          departments: [
            {
              $group: {
                _id: "$department",
                count: { $sum: 1 },
                resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } },
              },
            },
            { $sort: { count: -1 } },
          ],
          trend: [
            { $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) } } },
            {
              $group: {
                _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                complaints: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
          resolvedTime: [
            { $match: { status: { $in: ["RESOLVED", "CLOSED"] } } },
            { $project: { hours: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 3_600_000] } } },
            { $group: { _id: null, value: { $avg: "$hours" } } },
          ],
          satisfaction: [
            { $match: { "feedback.rating": { $exists: true } } },
            { $group: { _id: null, rating: { $avg: "$feedback.rating" }, count: { $sum: 1 } } },
            { $project: { _id: 0, rating: 1, count: 1 } },
          ],
          hotspots: [
            { $match: { "location.coordinates.0": { $exists: true } } },
            {
              $group: {
                _id: {
                  longitude: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 3] },
                  latitude: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 3] },
                  category: "$category",
                },
                count: { $sum: 1 },
                firstComplaint: { $first: "$complaintNumber" },
                lastComplaint: { $last: "$complaintNumber" },
              },
            },
            { $match: { count: { $gte: 2 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { _id: 1, count: 1, complaints: ["$firstComplaint", "$lastComplaint"] } },
          ],
        },
      },
    ]),
    User.countDocuments({ role: "OFFICER", active: true }),
    Complaint.find({ "feedback.rating": { $exists: true } })
      .sort({ "feedback.submittedAt": -1 })
      .limit(20)
      .select("complaintNumber category department status feedback citizen assignedOfficer")
      .populate("citizen", "name")
      .populate("assignedOfficer", "name")
      .lean(),
  ]);

  const result = facets[0];
  return {
    total: result.total[0]?.count ?? 0,
    statuses: result.statuses,
    priorities: result.priorities,
    categories: result.categories,
    departments: result.departments,
    trend: result.trend,
    averageResolutionHours: Math.round((result.resolvedTime[0]?.value ?? 0) * 10) / 10,
    satisfaction: result.satisfaction[0] ?? { rating: 0, count: 0 },
    officers,
    hotspots: result.hotspots,
    recentFeedback: recentFeedback.map((item) => ({ ...item, _id: item._id.toString() })) as AdminAnalytics["recentFeedback"],
  };
}
