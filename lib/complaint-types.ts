export type IdLike = string;

export type ComplaintAttachment = {
  url: string;
  filename: string;
  mimeType: string;
  size?: number;
  uploadId?: string;
};

export type ComplaintDetail = {
  _id: IdLike;
  complaintNumber: string;
  description: string;
  address?: string;
  category: string;
  department: string;
  priority: string;
  status: string;
  createdAt: Date | string;
  location?: { coordinates?: [number, number] | number[] };
  attachments?: ComplaintAttachment[];
  resolutionEvidence?: ComplaintAttachment[];
  assignedOfficer?: { _id?: IdLike; name?: string } | null;
  assignmentStatus?: string;
  resolutionRemarks?: string;
  duplicate?: { possible?: boolean; score?: number };
  feedback?: { rating?: number; comment?: string };
  ai?: { status?: string; summary?: string; sentiment?: string; confidence?: number; reason?: string; imageFindings: string[] };
  history?: Array<{ _id?: IdLike; action: string; actorName?: string; createdAt?: Date | string; remarks?: string }>;
};
