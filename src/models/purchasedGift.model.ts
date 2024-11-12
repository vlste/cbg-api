import { BaseModel } from "../types/base.model";
import { model, Schema, Types } from "mongoose";

export enum PurchasedGiftStatus {
  AVAILABLE = "available",
  GIFTED = "gifted",
}

export interface IPurchasedGift extends BaseModel {
  giftId: Types.ObjectId;
  ownerId: Types.ObjectId;
  buyerId: Types.ObjectId;
  status: PurchasedGiftStatus;
  boughtAt: Date;
}

const purchasedGiftSchema = new Schema<IPurchasedGift>(
  {
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    boughtAt: { type: Date, required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(PurchasedGiftStatus),
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PurchasedGiftModel = model<IPurchasedGift>(
  "PurchasedGift",
  purchasedGiftSchema
);
