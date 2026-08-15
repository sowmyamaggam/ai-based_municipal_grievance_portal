import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { Complaint } from "@/models/Complaint";
import { Department } from "@/models/Department";
import { Notification } from "@/models/Notification";
import { autoAssignComplaint } from "@/lib/assignment";

// Keep this in sync with the documented, supported portal model. An
// environment value can still override it for a future approved migration.
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const categoryValues = ["Road Damage", "Garbage", "Drainage", "Sewage", "Streetlight", "Water Supply", "Sanitation", "Flooding", "Infrastructure", "Public Safety", "Other"] as const;

const analysisSchema = z.object({
  category: z.enum(categoryValues),
  department: z.string().min(2).max(100),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  sentiment: z.enum(["NEUTRAL", "FRUSTRATED", "ANGRY", "URGENT", "POSITIVE"]),
  summary: z.string().min(5).max(300),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(5).max(600),
  imageFindings: z.array(z.string().max(120)).max(8).default([]),
});

export type AiAnalysis = z.infer<typeof analysisSchema>;

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

function configuredModelName() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function fallbackModelName() {
  return process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function unavailableModel(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("model") && (message.includes("no longer available") || message.includes("not found") || message.includes("404"));
}

async function withModelFallback<T>(request: (modelName: string) => Promise<T>) {
  const primary = configuredModelName();
  try {
    return await request(primary);
  } catch (error) {
    const fallback = fallbackModelName();
    if (fallback === primary || !unavailableModel(error)) throw error;
    return request(fallback);
  }
}

function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate.trim()) throw new Error("Gemini did not return a JSON object");
  return JSON.parse(candidate);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function boundedText(value: unknown, fallback: string, max: number) {
  const text = textValue(value);
  return (text || fallback).slice(0, max).trim();
}

function categoryFrom(value: unknown, description: string): AiAnalysis["category"] {
  const exact = textValue(value);
  if ((categoryValues as readonly string[]).includes(exact)) return exact as AiAnalysis["category"];

  const source = `${exact} ${description}`.toLowerCase();
  if (/pothole|road|asphalt|pavement|footpath|sidewalk/.test(source)) return "Road Damage";
  if (/garbage|trash|waste|litter|dump/.test(source)) return "Garbage";
  if (/sewage|sewer|septic/.test(source)) return "Sewage";
  if (/drain|stormwater|gutter/.test(source)) return "Drainage";
  if (/street\s*light|streetlight|lamp\s*post|lamp post/.test(source)) return "Streetlight";
  if (/water|tap|pipeline|pipe|leak/.test(source)) return "Water Supply";
  if (/flood|waterlog|inundat/.test(source)) return "Flooding";
  if (/sanitation|hygiene|toilet/.test(source)) return "Sanitation";
  if (/bridge|building|wall|infrastructure|public property/.test(source)) return "Infrastructure";
  if (/safety|danger|hazard|accident|injur|live wire/.test(source)) return "Public Safety";
  return "Other";
}

function priorityFrom(value: unknown, description: string): AiAnalysis["priority"] {
  const source = textValue(value).toUpperCase();
  let priority: AiAnalysis["priority"] = source.includes("CRITICAL") ? "CRITICAL" : source.includes("HIGH") ? "HIGH" : source.includes("LOW") ? "LOW" : "MEDIUM";
  const descriptionLower = description.toLowerCase();
  if (/sewage.*(house|home|residen)|collapse|collapsed|live\s+(electric|wire)|fire|electrocution|immediate danger/.test(descriptionLower)) return "CRITICAL";
  if (priority !== "CRITICAL" && /accident|injur|school|hospital|overflow|flood|blocked\s+road/.test(descriptionLower)) priority = "HIGH";
  return priority;
}

function sentimentFrom(value: unknown): AiAnalysis["sentiment"] {
  const source = textValue(value).toUpperCase();
  if (source.includes("URGENT")) return "URGENT";
  if (source.includes("ANGRY")) return "ANGRY";
  if (source.includes("FRUSTRAT") || source.includes("NEGATIVE")) return "FRUSTRATED";
  if (source.includes("POSITIVE")) return "POSITIVE";
  return "NEUTRAL";
}

function confidenceFrom(value: unknown) {
  const raw = typeof value === "number" ? value : Number.parseFloat(textValue(value).replace("%", ""));
  if (!Number.isFinite(raw)) return 0.5;
  return Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw));
}

function findingsFrom(value: unknown) {
  const entries = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,;]+/) : [];
  return entries.map((entry) => textValue(entry).slice(0, 120)).filter(Boolean).slice(0, 8);
}

function normalizeAnalysis(raw: unknown, description: string): AiAnalysis {
  const response = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const category = categoryFrom(response.category, description);
  return analysisSchema.parse({
    category,
    department: boundedText(response.department, "Unassigned", 100),
    priority: priorityFrom(response.priority, description),
    sentiment: sentimentFrom(response.sentiment),
    summary: boundedText(response.summary, description, 300),
    confidence: confidenceFrom(response.confidence),
    reason: boundedText(response.reason, `The report was classified as ${category}.`, 600),
    imageFindings: findingsFrom(response.imageFindings),
  });
}

async function remoteImageParts(urls: string[]) {
  const files = await Promise.all(
    urls.slice(0, 3).map(async (url) => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
        const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
        if (!response.ok || !mimeType.startsWith("image/")) return null;
        const bytes = Buffer.from(await response.arrayBuffer());
        return { inlineData: { data: bytes.toString("base64"), mimeType } };
      } catch {
        return null;
      }
    })
  );
  return files.filter((file): file is { inlineData: { data: string; mimeType: string } } => Boolean(file));
}

export async function createEmbedding(text: string) {
  const gemini = client();
  if (!gemini) return undefined;
  try {
    const result = await gemini.getGenerativeModel({ model: process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL }).embedContent(text);
    return result.embedding.values;
  } catch {
    return undefined;
  }
}

export async function analyzeComplaint(complaintId: string): Promise<{ status: "COMPLETED" | "PENDING" | "FAILED"; analysis?: AiAnalysis }> {
  const complaint = await Complaint.findById(complaintId).lean();
  if (!complaint) throw new Error("Complaint not found");
  if (!client()) {
    await Complaint.findByIdAndUpdate(complaintId, { "ai.status": "PENDING", "ai.failureReason": "Gemini is not configured" });
    return { status: "PENDING" };
  }

  await Complaint.findByIdAndUpdate(complaintId, { "ai.status": "PROCESSING", "ai.failureReason": undefined });
  try {
    const imageUrls = complaint.attachments.filter((file: { mimeType: string }) => file.mimeType.startsWith("image/")).map((file: { url: string }) => file.url);
    const imageParts = await remoteImageParts(imageUrls);
    const prompt = `You are the AI assistant for the AI-based Municipal Grievance Portal, assisting a municipal authority. Analyze this citizen complaint. Treat uploaded images as supporting evidence only; do not infer identities or sensitive personal attributes. Choose exactly one category from: Road Damage, Garbage, Drainage, Sewage, Streetlight, Water Supply, Sanitation, Flooding, Infrastructure, Public Safety, Other. Priority must consider public safety and severity, not sentiment alone. Return a single JSON object only, with category, department, priority (LOW|MEDIUM|HIGH|CRITICAL), sentiment (NEUTRAL|FRUSTRATED|ANGRY|URGENT|POSITIVE), summary (concise officer-ready summary), confidence (0-1), reason (short explainable reason), and imageFindings (string array).\n\nComplaint: ${complaint.description}\nAddress context: ${complaint.address || "Not provided"}`;
    const result = await withModelFallback((modelName) => client()!.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json", temperature: 0.1 } }).generateContent([prompt, ...imageParts]));
    const analysis = normalizeAnalysis(parseJson(result.response.text()), complaint.description);
    // Configured municipal mappings override a model-suggested department.
    const mappedDepartment = await Department.findOne({ categories: analysis.category, active: true }).select("name").lean();
    const department = mappedDepartment?.name || analysis.department;
    const embedding = await createEmbedding(complaint.description);
    await Complaint.findByIdAndUpdate(complaintId, {
      $set: {
        category: analysis.category,
        department,
        priority: analysis.priority,
        "ai.status": "COMPLETED",
        "ai.confidence": analysis.confidence,
        "ai.reason": analysis.reason,
        "ai.sentiment": analysis.sentiment,
        "ai.summary": analysis.summary,
        "ai.imageFindings": analysis.imageFindings,
        "ai.analyzedAt": new Date(),
        "ai.textEmbedding": embedding,
      },
      $push: { history: { action: "AI_ANALYZED", actorName: "Municipal portal AI", newValue: { category: analysis.category, department, priority: analysis.priority }, remarks: analysis.reason } },
    });
    // Department routing should result in a real work item whenever that team
    // has active officers. Assignment failures must never invalidate the AI
    // result or the citizen's complaint.
    try {
      await autoAssignComplaint(complaintId);
    } catch (assignmentError) {
      await Complaint.findByIdAndUpdate(complaintId, {
        $push: { history: { action: "AUTO_ASSIGNMENT_FAILED", actorName: "Municipal portal routing", remarks: assignmentError instanceof Error ? assignmentError.message.slice(0, 500) : "Automatic officer assignment was unavailable" } },
      });
    }
    try {
      await Notification.create({ user: complaint.citizen, complaint: complaint._id, title: "AI analysis complete", message: `${complaint.complaintNumber} has been classified and routed for municipal review.` });
    } catch {
      // A notification failure must not change a completed analysis into a failed one.
    }
    return { status: "COMPLETED", analysis: { ...analysis, department } };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 500) : "AI analysis failed";
    await Complaint.findByIdAndUpdate(complaintId, { $set: { "ai.status": "FAILED", "ai.failureReason": reason }, $push: { history: { action: "AI_ANALYSIS_FAILED", actorName: "Municipal portal AI", remarks: reason } } });
    return { status: "FAILED" };
  }
}

export async function answerWithGemini(prompt: string) {
  if (!client()) return null;
  const result = await withModelFallback((modelName) => client()!.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.3 } }).generateContent(prompt));
  return result.response.text();
}
