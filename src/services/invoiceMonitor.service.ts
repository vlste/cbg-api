import { CryptoBotService } from "./cryptoBot.service";
import { IInvoice, InvoiceModel, InvoiceStatus } from "../models/invoice.model";
import { GiftModel } from "../models/gift.model";
import { App } from "../app";
import { PaymentService } from "./payment.service";

export class InvoiceMonitorService {
  private readonly CHECK_INTERVAL = 5_000; // check pending invoices every 5 seconds
  private readonly BATCH_SIZE = 50;
  private isRunning = false;

  constructor(private readonly app: App) {}

  startMonitoring() {
    if (this.isRunning) return;
    this.isRunning = true;

    setInterval(async () => {
      await this.checkPendingInvoices();
    }, this.CHECK_INTERVAL);
  }

  private async checkPendingInvoices() {
    try {
      const pendingInvoices = await InvoiceModel.find({
        status: InvoiceStatus.PENDING,
        expiresAt: { $gt: new Date() },
      })
        .limit(this.BATCH_SIZE)
        .sort({ lastCheckedAt: 1 });

      if (pendingInvoices.length === 0) return;

      const invoiceIds = pendingInvoices.map((invoice) => invoice.invoiceId);
      const response = await CryptoBotService.getInvoices(invoiceIds);
      const data = response.data;

      if (!data.ok) {
        throw new Error(data.error);
      }

      const result = data.result;
      if (!result) {
        throw new Error("Failed to get invoices");
      }

      const invoices = result.items;
      if (!invoices) {
        throw new Error("Failed to get invoices");
      }

      console.log(`Checking ${invoices.length} invoices`);
      for (const invoice of invoices) {
        const dbInvoice = pendingInvoices.find(
          (i) => `${i.invoiceId}` === `${invoice.invoice_id}`
        ) as IInvoice;
        if (!dbInvoice) continue;
        if (invoice.status === "paid") {
          console.log(`Invoice ${invoice.invoice_id} is paid`);
          await this.handleGiftPaidInvoice(invoice, dbInvoice);
        } else if (invoice.status === "active") {
          console.log(`Invoice ${invoice.invoice_id} is active`);
        } else if (invoice.status === "expired") {
          console.log(`Invoice ${invoice.invoice_id} is expired`);
          await this.handleGiftExpiredInvoice(invoice, dbInvoice);
        }
      }
    } catch (error) {
      console.error("Error in checkPendingInvoices:", error);
    }
  }

  private async handleGiftPaidInvoice(invoice: any, dbInvoice: IInvoice) {
    await PaymentService.handlePaidInvoice(invoice, dbInvoice, this.app);
  }

  private async handleGiftExpiredInvoice(invoice: any, dbInvoice: IInvoice) {
    const session = await InvoiceModel.startSession();
    try {
      await session.withTransaction(async () => {
        await InvoiceModel.findOneAndUpdate(
          { invoiceId: invoice.invoice_id },
          {
            $set: {
              status: InvoiceStatus.EXPIRED,
              lastCheckedAt: new Date(),
            },
          },
          { session }
        );

        await GiftModel.findOneAndUpdate(
          { _id: dbInvoice.giftId },
          { $inc: { boughtCount: -1 } },
          { session }
        );
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      await session.endSession();
    }
  }
}
