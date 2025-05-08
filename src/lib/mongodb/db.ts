import mongoose from "mongoose";

const MONGO_DB_URI = process.env.MONGO_DB_URI;

if (!MONGO_DB_URI) {
  throw new Error(" MONGO_DB_URI is not defined in environment variables");
}

mongoose.set("strictQuery", true);

// Use global caching of mongoose connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_DB_URI, {
      dbName: "blogs",
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};
