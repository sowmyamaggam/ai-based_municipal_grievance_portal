import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    categories: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

type DepartmentDocument = InferSchemaType<typeof departmentSchema>;
export const Department: Model<DepartmentDocument> = (models.Department as Model<DepartmentDocument> | undefined) || model<DepartmentDocument>("Department", departmentSchema);
