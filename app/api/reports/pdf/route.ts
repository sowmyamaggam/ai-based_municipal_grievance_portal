import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authorization";
import { connectToDatabase } from "@/lib/db";
import { reportQuerySchema } from "@/lib/validation";
import { createWorkReportPdf } from "@/lib/work-report-pdf";
import { Complaint } from "@/models/Complaint";
import { User } from "@/models/User";

export const runtime = "nodejs";

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Use valid dates in YYYY-MM-DD format");
  return date;
}

function defaultStartDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function periodLabel(from: Date, to: Date) {
  return `${from.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} to ${to.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}`;
}

export async function GET(request: Request) {
  const access = await requireUser(["OFFICER", "ADMIN"]);
  if ("error" in access) return access.error;

  try {
    const params = new URL(request.url).searchParams;
    const data = reportQuerySchema.parse({
      scope: params.get("scope") || undefined,
      officerId: params.get("officerId") || undefined,
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
    });
    const from = parseDate(data.from) ?? defaultStartDate();
    const to = parseDate(data.to, true) ?? new Date();
    if (from > to) return NextResponse.json({ error: "The start date must be before the end date" }, { status: 400 });
    await connectToDatabase();

    let officerId: string | undefined;
    let preparedFor = "Municipal administration";
    let title = "Overall municipal work report";
    if (access.user.role === "OFFICER") {
      officerId = access.user.id;
      preparedFor = access.user.name;
      title = "Officer work report";
    } else if (data.scope === "officer") {
      if (!data.officerId) return NextResponse.json({ error: "Select an officer for an officer work report" }, { status: 400 });
      const officer = await User.findOne({ _id: data.officerId, role: "OFFICER" }).select("name department").lean();
      if (!officer) return NextResponse.json({ error: "Officer not found" }, { status: 404 });
      officerId = data.officerId;
      preparedFor = `${officer.name}${officer.department ? ` - ${officer.department}` : ""}`;
      title = "Officer work report";
    }

    const query: Record<string, unknown> = { createdAt: { $gte: from, $lte: to } };
    if (officerId) query.assignedOfficer = officerId;
    const complaints = await Complaint.find(query).sort({ createdAt: 1 }).select("complaintNumber createdAt category department priority status resolutionRemarks feedback").lean();
    const pdf = createWorkReportPdf({ title, preparedFor, periodLabel: periodLabel(from, to), complaints });
    const slug = officerId ? "officer-work" : "overall-work";
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="municipal-grievance-${slug}-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Unable to generate the PDF report. Check the selected dates and try again." }, { status: 400 });
  }
}
