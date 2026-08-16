import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["CITIZEN", "OFFICER", "ADMIN"], default: "CITIZEN", index: true },
    phone: { type: String, trim: true, maxlength: 20, unique: true, sparse: true },
    mobileVerified: { type: Boolean, default: false },
    department: { type: String, trim: true, maxlength: 100 },
    avatarUrl: { type: String, maxlength: 2048 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema>;
// Dynamic model reuse avoids hot-reload recompilation; application boundaries validate input with Zod.
export const User: any = models.User || model("User", userSchema);
