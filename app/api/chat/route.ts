import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { chatSchema } from "@/lib/validation";
import { Complaint } from "@/models/Complaint";
import { answerWithGemini } from "@/lib/ai";

function offlineAnswer(message: string, complaintSummary: string) {
  const text = message.toLowerCase();
  if (text.includes("register") || text.includes("submit")) return "Use ‘Report an issue’ to describe the problem, add photos if helpful, and share GPS only if you choose. Your report is saved even when AI analysis is temporarily unavailable.";
  if (text.includes("garbage")) return "Garbage reports are normally routed to the Sanitation Department.";
  if (text.includes("status") || text.includes("complaint")) return complaintSummary || "Open My complaints to track your submitted reports and their status timeline.";
  return "I can help you submit a municipal report, explain departments, or check the status of your own complaints.";
}

export async function POST(request: Request) {
  try {
    const data = chatSchema.parse(await request.json());
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return NextResponse.json({ error: "Please sign in to use the municipal portal assistant" }, { status: 401 });
    await connectToDatabase();
    const mine = await Complaint.find({ citizen: user.id }).sort({ updatedAt: -1 }).limit(5).select("complaintNumber status category department createdAt").lean();
    const summary = mine.map((item: { complaintNumber: string; status: string; category: string; department: string }) => `${item.complaintNumber}: ${item.status}, ${item.category}, ${item.department}`).join("; ");
    const prompt = `You are the AI assistant for the AI-based Municipal Grievance Portal. Answer in no more than 110 words, with plain, supportive language. You must only discuss this signed-in citizen's provided complaint context; never invent case details or reveal other residents' data. For emergency danger, tell them to contact local emergency services.\n\nCitizen's own complaint summaries: ${summary || "No submitted complaints."}\n\nQuestion: ${data.message}`;
    let response: string | null = null;
    try {
      response = await answerWithGemini(prompt);
    } catch {
      // The help flow remains useful when Gemini is temporarily unavailable.
    }
    return NextResponse.json({ response: response || offlineAnswer(data.message, summary ? `Your recent reports: ${summary}.` : "") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to answer right now" }, { status: 400 });
  }
}
