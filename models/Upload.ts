import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const uploadSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    filename: { type: String, required: true, maxlength: 180 },
    mimeType: { type: String, enum: ["image/jpeg", "image/png", "application/pdf"], required: true },
    size: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    storageKind: { type: String, enum: ["LOCAL", "CLOUDINARY"], required: true },
    storageKey: { type: String, required: true, maxlength: 2048 },
  },
  { timestamps: true }
);

uploadSchema.index({ owner: 1, createdAt: -1 });

type UploadDocument = InferSchemaType<typeof uploadSchema>;
export const Upload: Model<UploadDocument> = (models.Upload as Model<UploadDocument> | undefined) || model<UploadDocument>("Upload", uploadSchema);
