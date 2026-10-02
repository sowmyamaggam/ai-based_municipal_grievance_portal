import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Complaint } from "@/models/Complaint";
import { Department } from "@/models/Department";
import { Notification } from "@/models/Notification";
import { Upload } from "@/models/Upload";
import { autoAssignComplaint } from "@/lib/assignment";
import { classifyWorkType } from "@/lib/work-classifier";
import { retryTransientGemini } from "@/lib/gemini-retry";
import { routingForWorkType } from "@/lib/work-types";

// Keep this in sync with the documented, supported portal model. An
// environment value can still override it for a future approved migration.
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
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
  if (!key || key.startsWith("replace-with-")) return null;
  return new GoogleGenerativeAI(key);
}

function configuredModelName() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function imageModelUrl() {
  return process.env.ML_IMAGE_MODEL_URL?.trim();
}

async function withModelFallback<T>(request: (modelName: string) => Promise<T>) {
  return retryTransientGemini(() => request(configuredModelName()));
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function sentimentFrom(value: unknown, description = ""): AiAnalysis["sentiment"] {
  const source = `${textValue(value)} ${description}`.toUpperCase();
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

async function classifyImages(attachments: Array<{ uploadId?: unknown; mimeType: string }>) {
  const endpoint = imageModelUrl();
  if (!endpoint) return null;

  const ids = attachments
    .filter((file) => file.mimeType.startsWith("image/") && file.uploadId)
    .map((file) => String(file.uploadId))
    .slice(0, 3);
  if (!ids.length) return null;
  const uploads = await Upload.find({ _id: { $in: ids } }).lean();
  const files = await Promise.all(
    uploads.map(async (upload: { storageKind: string; storageKey: string; mimeType: string; filename: string }) => {
      try {
        const bytes = upload.storageKind === "LOCAL"
          ? await readFile(path.join(process.cwd(), "private-uploads", upload.storageKey))
          : Buffer.from(await (await fetch(upload.storageKey, { signal: AbortSignal.timeout(8_000) })).arrayBuffer());
        return { bytes, mimeType: upload.mimeType, filename: upload.filename };
      } catch {
        return null;
      }
    })
  );
  const validFiles = files.filter((file) => file !== null);
  if (!validFiles.length) return null;

  const predictions = await Promise.all(validFiles.map(async (file) => {
    try {
      const body = new FormData();
      body.append("file", new Blob([file.bytes], { type: file.mimeType }), file.filename);
      const response = await fetch(endpoint, {
        method: "POST",
        body,
        headers: process.env.ML_SERVICE_TOKEN?.trim()
          ? { "X-ML-Service-Token": process.env.ML_SERVICE_TOKEN.trim() }
          : undefined,
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return null;
      return await response.json() as { category?: unknown; confidence?: unknown; findings?: unknown };
    } catch {
      return null;
    }
  }));

  const best = predictions
    .filter((prediction): prediction is NonNullable<typeof prediction> => prediction !== null)
    .map((prediction) => ({
      category: categoryFrom(prediction.category, ""),
      confidence: confidenceFrom(prediction.confidence),
      findings: findingsFrom(prediction.findings),
    }))
    .sort((left, right) => right.confidence - left.confidence)[0];
  return best || null;
}

export async function analyzeComplaint(complaintId: string): Promise<{ status: "COMPLETED" | "PENDING" | "FAILED"; analysis?: AiAnalysis }> {
  const complaint = await Complaint.findById(complaintId).lean();
  if (!complaint) throw new Error("Complaint not found");
  await Complaint.findByIdAndUpdate(complaintId, { "ai.status": "PROCESSING", "ai.failureReason": undefined });
  try {
    const [classification, imageAnalysis] = await Promise.all([
      classifyWorkType(complaint.description),
      classifyImages(complaint.attachments),
    ]);
    const routing = routingForWorkType(classification.predictedWorkType);
    const mappedDepartment = await Department.findOne({ categories: routing.category, active: true }).select("name").lean();
    const department = mappedDepartment?.name || routing.department;
    const analysis = analysisSchema.parse({
      category: routing.category,
      department,
      priority: priorityFrom("", complaint.description),
      sentiment: sentimentFrom("", complaint.description),
      summary: complaint.description.replace(/\s+/g, " ").slice(0, 300),
      confidence: classification.confidence,
      reason: classification.reason || `Classified as ${classification.predictedWorkType} by the local municipal work-type model.`,
      imageFindings: imageAnalysis?.findings || [],
    });
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
        "ai.workType": classification.predictedWorkType,
        "ai.model": classification.model,
        "ai.modelVersion": classification.modelVersion,
        "ai.classificationThreshold": classification.threshold,
        "ai.classifiedAt": new Date(),
        "ai.fallbackUsed": classification.fallbackUsed,
      },
      $push: { history: { action: "AI_ANALYZED", actorName: "Municipal portal AI", newValue: { workType: classification.predictedWorkType, category: analysis.category, department, priority: analysis.priority, model: classification.model, fallbackUsed: classification.fallbackUsed }, remarks: analysis.reason } },
    });
    // Department routing should result in a real work item whenever that team
    // has active officers. Assignment failures must never invalidate the AI
    // result or the citizen's complaint.
    try {
      await autoAssignComplaint(complaintId);
    } catch {
      await Complaint.findByIdAndUpdate(complaintId, {
        $push: { history: { action: "AUTO_ASSIGNMENT_FAILED", actorName: "Municipal portal routing", remarks: "Automatic officer assignment was unavailable" } },
      });
    }
    try {
      await Notification.create({ user: complaint.citizen, complaint: complaint._id, title: "AI analysis complete", message: `${complaint.complaintNumber} has been classified and routed for municipal review.` });
    } catch {
      // A notification failure must not change a completed analysis into a failed one.
    }
    return { status: "COMPLETED", analysis: { ...analysis, department } };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorStatus = error && typeof error === "object" && "status" in error ? ` status=${String(error.status)}` : "";
    const apiKey = process.env.GEMINI_API_KEY?.trim() || "";
    const errorDetail = error instanceof Error
      ? error.message.replaceAll(apiKey, "[redacted]").replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").slice(0, 300)
      : "Unknown analysis failure";
    console.error(`Complaint AI analysis failed (${errorName}${errorStatus}): ${errorDetail}`);
    const reason = "AI analysis could not be completed. An authorized staff member can retry it.";
    await Complaint.findByIdAndUpdate(complaintId, { $set: { "ai.status": "FAILED", "ai.failureReason": reason }, $push: { history: { action: "AI_ANALYSIS_FAILED", actorName: "Municipal portal AI", remarks: reason } } });
    return { status: "FAILED" };
  }
}

export async function answerWithGemini(prompt: string) {
  if (!client()) return null;
  const result = await withModelFallback((modelName) => client()!.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.3 } }).generateContent(prompt));
  return result.response.text();
}
