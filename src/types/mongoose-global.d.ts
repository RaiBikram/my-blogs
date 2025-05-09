import mongoose from "mongoose";

// Declare the global variable `mongoose` with an explicit type
declare global {
  var mongoose: {
    conn: mongoose.Mongoose | null;
    promise: Promise<mongoose.Mongoose> | null;
  };
}

export {};
