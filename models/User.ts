import mongoose, { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["CITIZEN", "OFFICER", "ADMIN"], default: "CITIZEN", index: true },
    phone: { type: String, required: true, trim: true, maxlength: 16, unique: true, index: true },
    department: { type: String, trim: true, maxlength: 100 },
    avatarUrl: { type: String, maxlength: 2048 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });

export type UserDocument = InferSchemaType<typeof userSchema>;
// Dynamic model reuse avoids hot-reload recompilation; application boundaries validate input with Zod.
if (models.User && !models.User.schema.path("email")) mongoose.deleteModel("User");
export const User: Model<UserDocument> = (models.User as Model<UserDocument> | undefined) || model<UserDocument>("User", userSchema);
