import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { analyzeComplaint } from "@/lib/ai";
import { z } from "zod";

const voiceAnalysisSchema = z.object({
  transcript: z.string().min(10, "Transcript too short"),
  language: z.enum(["en", "te"]),
});

const systemPrompt = `You are an AI assistant helping to analyze voice-to-text transcripts for municipal complaint registration.

Extract the following information from the transcript:
1. Main complaint description
2. Category (Roads, Water Supply, Garbage/Sanitation, Street Lights, Drainage, Public Safety, Electricity, Environment, or Other)
3. Priority level (LOW, MEDIUM, HIGH, or CRITICAL) based on urgency and impact
4. Location description if mentioned

Respond with a JSON object containing:
{
  "description": "Clear, concise description of the complaint (20-500 characters)",
  "category": "Appropriate category from the list",
  "priority": "Priority level",
  "locationDescription": "Location details if mentioned, or null"
}

Important:
- Be lenient with speech recognition errors
- Focus on the core issue, not speech mistakes
- If category is unclear, default to "Other"
- Priority should be based on safety impact and urgency
- Keep description concise but complete`;

export async function POST(request: Request) {
  try {
    const data = voiceAnalysisSchema.parse(await request.json());

    await connectToDatabase();

    // Use Gemini to analyze and extract structured information from transcript
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });

    const prompt = `${systemPrompt}

User transcript (language: ${data.language === "en" ? "English" : "Telugu"}):
"${data.transcript}"

Extract and return only valid JSON.`;

    const response = await model.generateContent(prompt);
    const responseText = response.response.text();

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Fallback analysis
      analysis = {
        description: data.transcript.substring(0, 500),
        category: "Other",
        priority: "MEDIUM",
        locationDescription: null,
      };
    }

    // Validate and sanitize the analysis
    const validatedAnalysis = {
      description: sanitizeText(
        analysis.description || data.transcript.substring(0, 500),
        20,
        4000
      ),
      category: validateCategory(analysis.category),
      priority: validatePriority(analysis.priority),
      locationDescription: sanitizeText(
        analysis.locationDescription || "",
        0,
        300
      ) || undefined,
    };

    return NextResponse.json({
      success: true,
      analysis: validatedAnalysis,
      confidence: analysis.confidence || 0.8,
    });
  } catch (error) {
    console.error("Voice analysis error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze voice complaint",
      },
      { status: 500 }
    );
  }
}

function sanitizeText(text: string, minLength: number, maxLength: number): string {
  if (!text || typeof text !== "string") return "";

  let sanitized = text
    .trim()
    .replace(/\s+/g, " ")
    .substring(0, maxLength);

  if (sanitized.length < minLength) return "";
  return sanitized;
}

function validateCategory(category: string): string {
  const validCategories = [
    "Roads",
    "Water Supply",
    "Garbage/Sanitation",
    "Street Lights",
    "Drainage",
    "Public Safety",
    "Electricity",
    "Environment",
    "Other",
  ];

  if (!category || typeof category !== "string") return "Other";

  const normalized = category
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  for (const valid of validCategories) {
    if (valid.toLowerCase().includes(normalized) || normalized.includes(valid.toLowerCase())) {
      return valid;
    }
  }

  return "Other";
}

function validatePriority(priority: string): string {
  const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  if (!priority || typeof priority !== "string") return "MEDIUM";

  const normalized = priority.toUpperCase().trim();

  if (validPriorities.includes(normalized)) {
    return normalized;
  }

  // Try to find partial match
  for (const valid of validPriorities) {
    if (normalized.includes(valid)) {
      return valid;
    }
  }

  return "MEDIUM";
}
