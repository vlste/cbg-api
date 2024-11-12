import mongoose from "mongoose";
import { env } from "./env";

export class Database {
  static async connect() {
    try {
      await mongoose.connect(env.MONGODB_URL);
      console.log("MongoDB: connected");
    } catch (error) {
      console.error("MongoDB: connection error:", error);
      process.exit(1);
    }
  }

  static async disconnect() {
    await mongoose.disconnect();
    console.log("MongoDB: disconnected");
  }
}
