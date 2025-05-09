import mongoose from "mongoose";

// Get MongoDB URI from environment variables
const MONGO_DB_URI = process.env.MONGO_DB_URI;

if (!MONGO_DB_URI) {
  throw new Error("MONGO_DB_URI is not defined in environment variables");
}

mongoose.set("strictQuery", true);

// Use global caching of mongoose connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  // If there is an existing connection, return it
  if (cached.conn) return cached.conn;

  // If no connection is available, create one
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_DB_URI, {
      dbName: "blogs",
    });
  }

  // Wait for the promise to resolve and store the connection
  cached.conn = await cached.promise;
  return cached.conn;
};
