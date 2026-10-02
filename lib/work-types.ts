/**
 * The canonical municipal work routing vocabulary.  Keep this small and
 * stable: model output is validated against this list before it can affect a
 * complaint, and category/department derivations live here rather than being
 * repeated in route handlers.
 */
export const workTypes = ["Road", "Drainage", "Garbage", "Streetlight", "Water", "Sanitation", "Other"] as const;

export type WorkType = (typeof workTypes)[number];

export const workTypeRouting: Record<WorkType, { category: string; department: string }> = {
  Road: { category: "Road Damage", department: "Roads Department" },
  Drainage: { category: "Drainage", department: "Drainage Department" },
  Garbage: { category: "Garbage", department: "Sanitation Department" },
  Streetlight: { category: "Streetlight", department: "Electrical Department" },
  Water: { category: "Water Supply", department: "Water Supply Department" },
  Sanitation: { category: "Sanitation", department: "Sanitation Department" },
  Other: { category: "Other", department: "Municipal General Department" },
};

export function isWorkType(value: unknown): value is WorkType {
  return typeof value === "string" && (workTypes as readonly string[]).includes(value);
}

export function routingForWorkType(workType: WorkType) {
  return workTypeRouting[workType];
}
