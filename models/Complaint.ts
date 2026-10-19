import mongoose, { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    uploadId: { type: Schema.Types.ObjectId, ref: "Upload", required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const historySchema = new Schema(
  {
    action: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, default: "System" },
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    remarks: { type: String, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const locationSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: [(value: number[]) => value.length === 2, "Location needs longitude and latitude"],
    },
  },
  { _id: false }
);

const complaintSchema = new Schema(
  {
    complaintNumber: { type: String, required: true, unique: true, index: true },
    citizen: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    description: { type: String, required: true, maxlength: 4000 },
    address: { type: String, maxlength: 300 },
    location: { type: locationSchema, default: undefined },
    locationAccuracy: { type: Number },
    attachments: { type: [attachmentSchema], default: [] },
    category: { type: String, default: "Other", index: true },
    department: { type: String, default: "Unassigned", index: true },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM", index: true },
    status: { type: String, enum: ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "REJECTED", "DUPLICATE", "ESCALATED"], default: "SUBMITTED", index: true },
    assignedOfficer: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignmentStatus: { type: String, enum: ["UNASSIGNED", "PENDING", "ACCEPTED", "DECLINED"], default: "UNASSIGNED", index: true },
    assignedAt: Date,
    assignmentRespondedAt: Date,
    ai: {
      status: { type: String, enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"], default: "PENDING" },
      confidence: Number,
      reason: String,
      sentiment: { type: String, enum: ["NEUTRAL", "FRUSTRATED", "ANGRY", "URGENT", "POSITIVE"] },
      summary: String,
      imageFindings: [String],
      analyzedAt: Date,
      workType: { type: String, enum: ["Road", "Drainage", "Garbage", "Streetlight", "Water", "Sanitation", "Other"], index: true },
      model: { type: String, maxlength: 120 },
      modelVersion: { type: String, maxlength: 120 },
      classificationThreshold: { type: Number, min: 0, max: 1 },
      classifiedAt: Date,
      fallbackUsed: { type: Boolean, default: false },
      failureReason: String,
      textEmbedding: [Number],
    },
    duplicate: {
      possible: { type: Boolean, default: false },
      score: { type: Number, default: 0 },
      matches: [{ complaint: { type: Schema.Types.ObjectId, ref: "Complaint" }, score: Number, factors: Schema.Types.Mixed }],
      linkedIssue: { type: Schema.Types.ObjectId, ref: "Complaint" },
    },
    resolutionRemarks: { type: String, maxlength: 2000 },
    resolutionEvidence: { type: [attachmentSchema], default: [] },
    history: { type: [historySchema], default: [] },
    feedback: { rating: { type: Number, min: 1, max: 5 }, comment: String, submittedAt: Date },
  },
  { timestamps: true }
);

complaintSchema.index({ location: "2dsphere" });
complaintSchema.index({ createdAt: -1, status: 1 });
complaintSchema.index({ "feedback.submittedAt": -1 });
complaintSchema.index({ department: 1, status: 1, createdAt: -1 });
complaintSchema.index({ assignedOfficer: 1, status: 1, createdAt: -1 });

export type ComplaintRecord = {
  _id: Types.ObjectId;
  complaintNumber: string;
  citizen: Types.ObjectId;
  description: string;
  category: string;
  department: string;
  priority: string;
  status: string;
  location?: { type: "Point"; coordinates: [number, number] };
  createdAt: Date;
};

// Mongoose's dynamic populated-document types are intentionally narrowed at route boundaries.
if (models.Complaint && !models.Complaint.schema.path("location")) mongoose.deleteModel("Complaint");
type ComplaintDocument = InferSchemaType<typeof complaintSchema>;
export const Complaint: Model<ComplaintDocument> = (models.Complaint as Model<ComplaintDocument> | undefined) || model<ComplaintDocument>("Complaint", complaintSchema);
