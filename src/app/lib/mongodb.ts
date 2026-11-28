/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

const MONGODB_URI = process.env.MONGODB_URI!;

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (
    process.env.NODE_ENV === "production" &&
    MONGODB_URI.includes("journal_dev")
  ) {
    throw new Error("Prod is pointing at DEV database");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
