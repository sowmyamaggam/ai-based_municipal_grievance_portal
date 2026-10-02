import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { Complaint } from "@/models/Complaint";
import { User } from "@/models/User";

export async function GET() {
  const access = await requireUser(["ADMIN"]);
  if ("error" in access) return access.error;
  try {
    await connectToDatabase();
    const [total, statuses, priorities, categories, departments, trend, resolvedTime, satisfaction, officers, hotspots, recentFeedback] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Complaint.aggregate([
        {
          $group: {
            _id: "$department",
            count: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Complaint.aggregate([{ $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) } } }, { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, complaints: { $sum: 1 } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
      Complaint.aggregate([{ $match: { status: { $in: ["RESOLVED", "CLOSED"] } } }, { $project: { hours: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 3_600_000] } } }, { $group: { _id: null, value: { $avg: "$hours" } } }]),
      Complaint.aggregate([{ $match: { "feedback.rating": { $exists: true } } }, { $group: { _id: null, rating: { $avg: "$feedback.rating" }, count: { $sum: 1 } } }]),
      User.countDocuments({ role: "OFFICER", active: true }),
      Complaint.aggregate([{ $match: { "location.coordinates.0": { $exists: true } } }, { $group: { _id: { longitude: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 3] }, latitude: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 3] }, category: "$category" }, count: { $sum: 1 }, complaints: { $push: "$complaintNumber" } } }, { $match: { count: { $gte: 2 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      Complaint.find({ "feedback.rating": { $exists: true } }).sort({ "feedback.submittedAt": -1 }).limit(20).select("complaintNumber category department status feedback citizen assignedOfficer").populate("citizen", "name").populate("assignedOfficer", "name").lean(),
    ]);
    return NextResponse.json({ total, statuses, priorities, categories, departments, trend, averageResolutionHours: Math.round((resolvedTime[0]?.value ?? 0) * 10) / 10, satisfaction: satisfaction[0] ?? { rating: 0, count: 0 }, officers, hotspots, recentFeedback });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
