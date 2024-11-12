import { Schema, model } from "mongoose";
import { BaseModel } from "../types/base.model";
import { IPrice, Token } from "./types";

export interface IGiftAttributes {
  bgVariant: number;
}

export interface IGift extends BaseModel, IGiftAttributes {
  name: string;
  slug: string;
  price: IPrice;
  attributes: IGiftAttributes;
  boughtCount: number;
  totalCount: number;
  isActive: boolean;
}

const giftSchema = new Schema<IGift>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: {
      amount: { type: Number, required: true },
      token: { type: String, enum: Object.values(Token), required: true },
    },
    attributes: {
      bgVariant: { type: Number, required: true },
    },
    boughtCount: { type: Number, default: 0 },
    totalCount: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

giftSchema.index({ isActive: 1 });

export const GiftModel = model<IGift>("Gift", giftSchema);
