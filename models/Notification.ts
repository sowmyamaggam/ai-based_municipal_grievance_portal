import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    complaint: { type: Schema.Types.ObjectId, ref: "Complaint" },
    kind: { type: String, enum: ["GENERAL", "STATUS_UPDATED", "COMPLAINT_RESOLVED"], default: "GENERAL", index: true },
    title: { type: String, required: true, maxlength: 140 },
    message: { type: String, required: true, maxlength: 500 },
    readAt: Date,
  },
  { timestamps: true }
);

type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const Notification: Model<NotificationDocument> = (models.Notification as Model<NotificationDocument> | undefined) || model<NotificationDocument>("Notification", notificationSchema);
