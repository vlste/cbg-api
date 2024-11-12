import mongoose, {
  AnyBulkWriteOperation,
  Model,
  Schema,
  model,
} from "mongoose";
import { BaseModel } from "../types/base.model";
import { ActivityType } from "./activity.model";

export interface IUser extends BaseModel {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode?: string;
  registeredAt?: Date;
  isPremium: boolean;
  isBot: boolean;
  rank: number;
  giftsReceived: number;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String },
    isBot: { type: Boolean, required: true, default: false },
    isPremium: { type: Boolean, required: true, default: false },
    languageCode: { type: String },
    rank: { type: Number, required: true, default: 0 },
    giftsReceived: { type: Number, required: true, default: 0 },
    registeredAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

userSchema.statics.updateRanks = async function () {
  const rankedUsers = await this.aggregate([
    {
      $lookup: {
        from: "activities",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$targetId", "$$userId"] },
                  { $eq: ["$type", ActivityType.GIFT_SENT] },
                ],
              },
            },
          },
          { $count: "count" },
        ],
        as: "giftCount",
      },
    },
    {
      $addFields: {
        giftCount: { $ifNull: [{ $arrayElemAt: ["$giftCount.count", 0] }, 0] },
      },
    },
    { $sort: { giftCount: -1, createdAt: 1 } },
    { $project: { _id: 1 } },
  ]);

  const bulkOps = rankedUsers.map((user, index) => ({
    updateOne: {
      filter: { _id: user._id },
      update: { $set: { rank: index + 1 } },
    },
  }));

  return this.bulkWrite(bulkOps);
};

interface IUserModel extends Model<IUser> {
  updateRanks: () => Promise<AnyBulkWriteOperation>;
}

export const UserModel = model<IUser, IUserModel>("User", userSchema);
