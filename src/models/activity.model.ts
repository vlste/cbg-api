import { Schema, model, Types } from "mongoose";
import { BaseModel } from "../types/base.model";
import { IPrice, Token } from "./types";

export enum ActivityType {
  GIFT_SENT = "gift_sent",
  GIFT_PURCHASED = "gift_purchased",
  // GIFT_RECEIVED = "gift_received",
}

export interface IActivity extends BaseModel {
  type: ActivityType;
  actorId: Types.ObjectId;
  targetId?: Types.ObjectId;
  purchasedGiftId: Types.ObjectId;
  giftId: Types.ObjectId;
  transferId?: Types.ObjectId;
  purchaseMetadata?: {
    invoiceId: string;
    price: IPrice;
  };
}

const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: Schema.Types.ObjectId, ref: "User" },
    purchasedGiftId: {
      type: Schema.Types.ObjectId,
      ref: "PurchasedGift",
      required: true,
    },
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", required: true },
    transferId: { type: Schema.Types.ObjectId, ref: "GiftTransfer" },
    purchaseMetadata: {
      type: {
        invoiceId: { type: String, required: true },
        price: {
          amount: { type: Number, required: true },
          token: { type: String, enum: Object.values(Token), required: true },
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ actorId: 1, createdAt: -1 });
activitySchema.index({ targetId: 1, createdAt: -1 });
activitySchema.index({ giftId: 1, createdAt: -1 });

export const ActivityModel = model<IActivity>("Activity", activitySchema);
