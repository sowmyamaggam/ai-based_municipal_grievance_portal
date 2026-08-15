import mongoose from "mongoose";

const globalForMongoose = global as typeof globalThis & {
  mongooseConnection?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const cached = globalForMongoose.mongooseConnection ?? { conn: null, promise: null };
globalForMongoose.mongooseConnection = cached;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured. Add it to .env.local to use the AI-based Municipal Grievance Portal.");

  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
