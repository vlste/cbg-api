import { Schema } from "mongoose";

export enum Token {
  USDT = "USDT",
  TON = "TON",
  ETH = "ETH",
  // any
}

export interface IPrice {
  amount: number;
  token: Token;
}
