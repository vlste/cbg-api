import { ActivityModel, ActivityType } from "../models/activity.model";
import { PurchasedGiftModel } from "../models/purchasedGift.model";
import { IInvoice, InvoiceModel, InvoiceStatus } from "../models/invoice.model";
import { App } from "../app";
import { IGift } from "../models/gift.model";
import { IUser } from "../models/user.model";
import { PurchasedGiftStatus } from "../models/purchasedGift.model";

export class PaymentService {
  public static async handlePaidInvoice(
    invoice: any,
    dbInvoice: IInvoice,
    app: App
  ) {
    const session = await InvoiceModel.startSession();

    try {
      const purchasedGift = await session.withTransaction(async () => {
        await InvoiceModel.findOneAndUpdate(
          { invoiceId: invoice.invoice_id },
          {
            $set: {
              status: InvoiceStatus.PAID,
              lastCheckedAt: new Date(),
            },
          },
          { session }
        );

        const result = await PurchasedGiftModel.create(
          [
            {
              giftId: dbInvoice.giftId,
              ownerId: dbInvoice.userId,
              buyerId: dbInvoice.userId,
              status: PurchasedGiftStatus.AVAILABLE,
              boughtAt: new Date(),
            },
          ],
          { session }
        );

        const purchasedGift = result[0];

        await ActivityModel.create(
          [
            {
              type: ActivityType.GIFT_PURCHASED,
              actorId: dbInvoice.userId,
              targetId: dbInvoice.userId,
              purchasedGiftId: purchasedGift._id,
              giftId: purchasedGift.giftId,
              purchaseMetadata: {
                invoiceId: dbInvoice.invoiceId,
                price: dbInvoice.price,
              },
            },
          ],
          { session }
        );

        return purchasedGift;
      });

      const gift = await PurchasedGiftModel.findOne({
        _id: purchasedGift._id,
      }).populate<{ giftId: IGift; ownerId: IUser }>(["giftId", "ownerId"]);

      if (gift) {
        await app.bot.sendBoughtGiftNotification(
          gift.ownerId.telegramId.toString(),
          gift as any
        );
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      await session.endSession();
    }
  }
}
