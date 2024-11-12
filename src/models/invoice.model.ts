import { Schema, model, Types } from "mongoose";
import { BaseModel } from "../types/base.model";
import { IPrice, Token } from "./types";

export enum InvoiceStatus {
  PENDING = "pending",
  PAID = "paid",
  EXPIRED = "expired",
  FAILED = "failed",
}

export interface IInvoice extends BaseModel {
  invoiceId: string;
  info: {
    hash: string;
    miniAppURL: string;
  };
  giftId: Types.ObjectId;
  userId: Types.ObjectId;
  price: IPrice;
  status: InvoiceStatus;
  lastCheckedAt: Date;
  expiresAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    info: {
      hash: { type: String, required: true },
      miniAppURL: { type: String, required: true },
    },
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", required: true },
    price: {
      amount: { type: Number, required: true },
      token: { type: String, enum: Object.values(Token), required: true },
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.PENDING,
    },
    lastCheckedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const InvoiceModel = model<IInvoice>("Invoice", invoiceSchema);
