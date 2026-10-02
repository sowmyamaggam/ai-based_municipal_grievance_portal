import { after, NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { complaintSchema } from "@/lib/validation";
import { Complaint } from "@/models/Complaint";
import { Notification } from "@/models/Notification";
import { analyzeComplaint } from "@/lib/ai";
import { detectDuplicates } from "@/lib/duplicates";
import { rateLimit, requireSameOrigin } from "@/lib/request-security";
import { validateOwnedAttachments } from "@/lib/upload-security";

function complaintNumber() {
  return `CG-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET() {
  const access = await requireUser();
  if ("error" in access) return access.error;
  try {
    await connectToDatabase();
    const query = access.user.role === "CITIZEN" ? { citizen: access.user.id } : access.user.role === "OFFICER" ? { assignedOfficer: access.user.id } : {};
    const complaints = await Complaint.find(query).sort({ createdAt: -1 }).limit(50).populate("citizen", "name phone").populate("assignedOfficer", "name phone department").lean();
    return NextResponse.json({ complaints });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireUser(["CITIZEN"]);
  if ("error" in access) return access.error;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const limitError = rateLimit(request, "complaint-create", 10, 15 * 60 * 1000);
  if (limitError) return limitError;
  let failureStage = "validation";
  try {
    const data = complaintSchema.parse(await request.json());
    failureStage = "database-connection";
    await connectToDatabase();
    failureStage = "attachment-validation";
    if (!(await validateOwnedAttachments(data.attachments, access.user.id, request))) {
      return NextResponse.json({ error: "One or more attachments are invalid or expired." }, { status: 400 });
    }
    failureStage = "complaint-create";
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
    // notification pipeline continue without keeping a citizen at a loading
    // state or losing their report when Gemini is slow or unavailable.
    failureStage = "background-scheduling";
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
    if (process.env.NODE_ENV !== "production") {
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const errorCode = error && typeof error === "object" && "code" in error ? ` code=${String(error.code)}` : "";
      console.error(`Complaint submission failed at ${failureStage} (${errorName}${errorCode})`);
    }
    return NextResponse.json({ error: "Unable to submit complaint. Check the details and try again." }, { status: 400 });
  }
}
