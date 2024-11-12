import { BaseModel } from "../types/base.model";
import { model, Schema, Types } from "mongoose";

export enum GiftTransferStatus {
  PENDING = "pending",
  // SENT = "sent",
  RECEIVED = "received",
}

export interface IGiftTransfer extends BaseModel {
  purchasedGiftId: Types.ObjectId;
  status: GiftTransferStatus;
  senderId: Types.ObjectId;
  receiverId?: Types.ObjectId;
  sendToken?: string;
  expiresAt?: Date; // maybe not needed
  receivedAt?: Date; // maybe not needed
}

const giftTransferSchema = new Schema<IGiftTransfer>({
  purchasedGiftId: {
    type: Schema.Types.ObjectId,
    ref: "PurchasedGift",
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(GiftTransferStatus),
    default: GiftTransferStatus.PENDING,
  },
  senderId: { type: Schema.Types.ObjectId, required: true },
  receiverId: { type: Schema.Types.ObjectId },
  sendToken: { type: String },
  expiresAt: { type: Date },
  receivedAt: { type: Date },
});

export const GiftTransferModel = model<IGiftTransfer>(
  "GiftTransfer",
  giftTransferSchema
);
