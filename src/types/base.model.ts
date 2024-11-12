import { Document } from "mongoose";
import { Types } from "mongoose";

export interface BaseModel extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
