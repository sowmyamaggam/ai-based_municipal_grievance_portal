import { Schema, model, models, type Types } from "mongoose";

const conversationStateSchema = new Schema(
  {
    step: {
      type: String,
      enum: ["INITIAL", "ASK_CATEGORY", "ASK_DESCRIPTION", "ASK_LOCATION", "ASK_IMAGES", "CONFIRM", "COMPLETED"],
      default: "INITIAL",
    },
    data: {
      category: String,
      description: String,
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
      images: [String],
    },
    lastMessageAt: Date,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const whatsappUserSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    displayName: String,
    conversationState: conversationStateSchema,
    linkedComplaints: [
      {
        complaintId: { type: Schema.Types.ObjectId, ref: "Complaint" },
        linkedAt: { type: Date, default: Date.now },
      },
    ],
    notificationsEnabled: { type: Boolean, default: true },
    messageHistory: [
      {
        direction: { type: String, enum: ["INBOUND", "OUTBOUND"] },
        messageType: { type: String, enum: ["TEXT", "IMAGE", "LOCATION", "BUTTON_CLICK"] },
        content: String,
        mediaUrl: String,
        messageId: String,
        status: { type: String, enum: ["SENT", "DELIVERED", "READ", "FAILED"], default: "SENT" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    lastSeenAt: Date,
  },
  { timestamps: true }
);

whatsappUserSchema.index({ "linkedComplaints.complaintId": 1 });

export type WhatsAppUserDocument = {
  _id: Types.ObjectId;
  phoneNumber: string;
  citizenId?: Types.ObjectId;
  displayName?: string;
  conversationState?: {
    step: string;
    data?: {
      category?: string;
      description?: string;
      location?: { latitude: number; longitude: number; address?: string };
      images?: string[];
    };
    lastMessageAt?: Date;
    createdAt: Date;
  };
  linkedComplaints?: Array<{
    complaintId: Types.ObjectId;
    linkedAt: Date;
  }>;
  notificationsEnabled?: boolean;
  messageHistory?: Array<{
    direction: "INBOUND" | "OUTBOUND";
    messageType: "TEXT" | "IMAGE" | "LOCATION" | "BUTTON_CLICK";
    content?: string;
    mediaUrl?: string;
    messageId?: string;
    status: "SENT" | "DELIVERED" | "READ" | "FAILED";
    timestamp: Date;
  }>;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const WhatsAppUser: any = models.WhatsAppUser || model("WhatsAppUser", whatsappUserSchema);
