import axios, { AxiosResponse } from "axios";
import { env } from "../config/env";
import { Token } from "../models/types";

export class CryptoBotService {
  static BASE_URL = env.CRYPTO_BOT_BASE_URL;

  static async createInvoice(data: {
    amount: number;
    token: Token;
    expiresIn?: number;
  }): Promise<any> {
    const response = await this.request("POST", "createInvoice", {
      currency_type: "crypto",
      asset: data.token,
      amount: data.amount,
      expires_in: data.expiresIn,
    });

    if (!response.data) {
      throw new Error("Failed to create invoice");
    }

    const ok = response.data.ok;

    if (!ok) {
      throw new Error(response.data.error);
    }

    const result = response.data.result;

    if (!result) {
      throw new Error("Failed to create invoice");
    }

    return result;
  }

  static async getInvoice(invoiceId: string): Promise<AxiosResponse<any>> {
    return this.getInvoices([invoiceId]);
  }

  static async getInvoices(invoiceIds: string[]): Promise<AxiosResponse<any>> {
    const response = await this.request("GET", `getInvoices`, {
      invoice_ids: invoiceIds.join(","),
    });

    return response;
  }

  private static async request(
    method: string,
    path: string,
    data: any
  ): Promise<AxiosResponse<any>> {
    const response = await axios.request({
      method,
      url: `${this.BASE_URL}${path}`,
      data,
      headers: {
        "Crypto-Pay-API-Token": env.CRYPTO_BOT_API_KEY,
      },
    });

    return response;
  }
}
