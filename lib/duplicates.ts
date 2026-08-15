import { Complaint } from "@/models/Complaint";

type NearbyComplaint = { _id: unknown; description: string; category: string; createdAt: Date | string; location?: { coordinates: number[] }; ai?: { textEmbedding?: number[]; imageFindings?: string[] } };
type DuplicateMatch = { complaint: unknown; score: number; factors: { text: number; image: number; proximity: number; category: number; time: number; distanceMeters: number } };

const maxDistance = Math.min(Math.max(Number(process.env.DUPLICATE_DISTANCE_METERS || 100), 25), 5_000);
const duplicateThreshold = Math.min(Math.max(Number(process.env.DUPLICATE_SCORE_THRESHOLD || 0.7), 0.1), 1);

function cosine(a?: number[], b?: number[]) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let index = 0; index < a.length; index += 1) { dot += a[index] * b[index]; normA += a[index] ** 2; normB += b[index] ** 2; }
  return normA && normB ? Math.max(0, dot / Math.sqrt(normA * normB)) : 0;
}

function lexicalSimilarity(first: string, second: string) {
  const tokens = (value: string) => new Set(value.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  const a = tokens(first), b = tokens(second);
  const union = new Set([...a, ...b]);
  return union.size ? [...a].filter((word) => b.has(word)).length / union.size : 0;
}

function distanceMeters(a: number[], b: number[]) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const [lng1, lat1] = a, [lng2, lat2] = b;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const arc = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function findingsSimilarity(a: string[] = [], b: string[] = []) {
  return a.length && b.length ? lexicalSimilarity(a.join(" "), b.join(" ")) : 0.5;
}

export async function detectDuplicates(complaintId: string) {
  // Local databases created before this schema may not yet have the geospatial index.
  // Ensure it exists before a $near query; normal calls are a no-op after creation.
  await Complaint.createIndexes();
  const source = await Complaint.findById(complaintId).lean();
  if (!source?.location?.coordinates || source.location.coordinates.length !== 2) return [];

  const nearby: NearbyComplaint[] = await Complaint.find({
    _id: { $ne: source._id },
    location: { $near: { $geometry: source.location, $maxDistance: maxDistance } },
    createdAt: { $gte: new Date(Date.now() - 90 * 86_400_000) },
  }).limit(15).lean();

  const matches: DuplicateMatch[] = nearby.map((candidate) => {
    const text = cosine(source.ai?.textEmbedding, candidate.ai?.textEmbedding) || lexicalSimilarity(source.description, candidate.description);
    const image = findingsSimilarity(source.ai?.imageFindings, candidate.ai?.imageFindings);
    const meters = distanceMeters(source.location!.coordinates, candidate.location!.coordinates);
    const proximity = Math.max(0, 1 - meters / maxDistance);
    const category = source.category === candidate.category ? 1 : 0;
    const ageDays = Math.abs(new Date(source.createdAt).getTime() - new Date(candidate.createdAt).getTime()) / 86_400_000;
    const time = Math.exp(-ageDays / 30);
    const score = Number((0.4 * text + 0.15 * image + 0.25 * proximity + 0.1 * category + 0.1 * time).toFixed(3));
    return { complaint: candidate._id, score, factors: { text: Number(text.toFixed(3)), image: Number(image.toFixed(3)), proximity: Number(proximity.toFixed(3)), category, time: Number(time.toFixed(3)), distanceMeters: Math.round(meters) } };
  }).filter((match: DuplicateMatch) => match.score >= 0.35).sort((a: DuplicateMatch, b: DuplicateMatch) => b.score - a.score);

  await Complaint.findByIdAndUpdate(complaintId, {
    $set: { "duplicate.possible": matches.some((match: DuplicateMatch) => match.score >= duplicateThreshold), "duplicate.score": matches[0]?.score ?? 0, "duplicate.matches": matches.slice(0, 5) },
    $push: matches.length ? { history: { action: "DUPLICATE_CHECKED", actorName: "Municipal portal AI", newValue: { possible: matches[0]?.score >= duplicateThreshold, topScore: matches[0]?.score }, remarks: `${matches.length} nearby reports evaluated using text, image findings, distance, category, and time.` } } : {},
  });
  return matches;
}
