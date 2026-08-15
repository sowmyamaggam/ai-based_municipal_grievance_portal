import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const required = ["MONGODB_URI", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment values: ${missing.join(", ")}`);
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.collection("users");
const departments = mongoose.connection.collection("departments");
const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);
const now = new Date();
await users.updateOne(
  { email: process.env.SEED_ADMIN_EMAIL.toLowerCase() },
  { $set: { name: process.env.SEED_ADMIN_NAME || "Municipal Portal Administrator", email: process.env.SEED_ADMIN_EMAIL.toLowerCase(), passwordHash, role: "ADMIN", active: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
  { upsert: true }
);
console.log(`Administrator ready: ${process.env.SEED_ADMIN_EMAIL}`);
const defaultDepartments = [
  ["Roads Department", ["Road Damage", "Infrastructure"]],
  ["Sanitation Department", ["Garbage", "Sanitation", "Sewage"]],
  ["Drainage Department", ["Drainage", "Flooding", "Sewage"]],
  ["Electrical Department", ["Streetlight"]],
  ["Water Supply Department", ["Water Supply"]],
  ["Public Safety Department", ["Public Safety", "Other"]],
];
for (const [name, categories] of defaultDepartments) {
  await departments.updateOne({ name }, { $setOnInsert: { name, categories, active: true, createdAt: now, updatedAt: now } }, { upsert: true });
}
console.log("Default department mappings are ready.");
await mongoose.disconnect();
