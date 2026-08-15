import { after, NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { complaintSchema } from "@/lib/validation";
import { Complaint } from "@/models/Complaint";
import { Notification } from "@/models/Notification";
import { analyzeComplaint } from "@/lib/ai";
import { detectDuplicates } from "@/lib/duplicates";

function complaintNumber() {
  return `CG-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET() {
  const access = await requireUser();
  if ("error" in access) return access.error;
  try {
    await connectToDatabase();
    const query = access.user.role === "CITIZEN" ? { citizen: access.user.id } : access.user.role === "OFFICER" ? { assignedOfficer: access.user.id } : {};
    const complaints = await Complaint.find(query).sort({ createdAt: -1 }).limit(100).populate("citizen", "name email").populate("assignedOfficer", "name email department").lean();
    return NextResponse.json({ complaints });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load complaints" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireUser(["CITIZEN"]);
  if ("error" in access) return access.error;
  try {
    const data = complaintSchema.parse(await request.json());
    await connectToDatabase();
    const complaint = await Complaint.create({
      complaintNumber: complaintNumber(),
      citizen: access.user.id,
      description: data.description,
      address: data.address,
      location: data.location ? { type: "Point", coordinates: [data.location.longitude, data.location.latitude] } : undefined,
      locationAccuracy: data.location?.accuracy,
      attachments: data.attachments,
      history: [{ action: "COMPLAINT_SUBMITTED", actor: access.user.id, actorName: access.user.name, newValue: "SUBMITTED", remarks: "Citizen submitted a new complaint." }],
    });
    // Notification delivery is helpful but must never make a saved report look
    // like a failed submission.
    try {
      await Notification.create({ user: access.user.id, complaint: complaint._id, title: "Complaint received", message: `${complaint.complaintNumber} was registered. AI analysis will update this report shortly.` });
    } catch {
      // Notifications can be retried or delivered by a future provider.
    }

    // Return as soon as the report is durable. `after` lets the analysis and
    // duplicate pipeline continue without keeping a citizen at a loading state
    // or losing their report when Gemini is slow or unavailable.
    after(async () => {
      await analyzeComplaint(complaint._id.toString());
      try {
        await detectDuplicates(complaint._id.toString());
      } catch (duplicateError) {
        // A geospatial/indexing issue must never affect the submitted report.
        await Complaint.findByIdAndUpdate(complaint._id, {
          $push: {
            history: {
              action: "DUPLICATE_CHECK_FAILED",
              actorName: "System",
              remarks: duplicateError instanceof Error ? duplicateError.message.slice(0, 500) : "Duplicate check unavailable",
            },
          },
        });
      }
    });

    return NextResponse.json({ complaint: complaint.toObject(), aiStatus: "PENDING", possibleDuplicates: [] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit complaint";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
