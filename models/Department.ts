import { Schema, model, models } from "mongoose";

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    categories: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Department: any = models.Department || model("Department", departmentSchema);
