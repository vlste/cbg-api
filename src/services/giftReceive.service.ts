import {
  GiftTransferModel,
  GiftTransferStatus,
} from "../models/giftTransfer.model";
import { IUser, UserModel } from "../models/user.model";
import {
  PurchasedGiftModel,
  PurchasedGiftStatus,
} from "../models/purchasedGift.model";
import { ActivityModel, ActivityType } from "../models/activity.model";
import { IGift } from "../models/gift.model";
import { ProfileMapper } from "../mappers/mappers";
import { App } from "../app";

export class GiftReceiveService {
  static async receiveGift(token: string, telegramId: number, app: App) {
    const user = await UserModel.findOne({ telegramId });
    if (!user) {
      throw new Error("User not found");
    }

    const transfer = await GiftTransferModel.findOne({ sendToken: token });
    if (!transfer || transfer.receiverId) {
      throw new Error("Transfer not found or already received");
    }

    if (transfer.senderId.toString() === user._id.toString()) {
      throw new Error("Cannot receive gift from yourself");
    }

    const session = await PurchasedGiftModel.startSession();
    try {
      await session.withTransaction(async () => {
        const purchasedGift = await PurchasedGiftModel.findByIdAndUpdate(
          transfer.purchasedGiftId,
          {
            status: PurchasedGiftStatus.GIFTED,
            ownerId: user._id,
          },
          { session }
        );

        if (!purchasedGift) {
          throw new Error("Purchased gift not found");
        }

        await GiftTransferModel.findByIdAndUpdate(
          transfer._id,
          {
            status: GiftTransferStatus.RECEIVED,
            receiverId: user._id,
            receivedAt: new Date(),
          },
          { session }
        );

        await ActivityModel.create(
          [
            {
              type: ActivityType.GIFT_SENT,
              actorId: transfer.senderId,
              targetId: user._id,
              purchasedGiftId: transfer.purchasedGiftId,
              giftId: purchasedGift.giftId,
            },
          ],
          { session }
        );

        await UserModel.findByIdAndUpdate(
          user._id,
          { $inc: { giftsReceived: 1 } },
          { session }
        );
      });

      const purchasedGift = await PurchasedGiftModel.findById(
        transfer.purchasedGiftId
      ).populate<{ giftId: IGift; ownerId: IUser; buyerId: IUser }>([
        "giftId",
        "ownerId",
        "buyerId",
      ]);

      if (!purchasedGift) {
        throw new Error("Purchased gift not found after transaction");
      }

      app.bot
        .sendReceivedGiftNotification(
          purchasedGift.buyerId.telegramId.toString(),
          purchasedGift.giftId,
          purchasedGift.ownerId
        )
        .catch((error) => {
          console.error("Failed to send received gift notification:", error);
        });

      UserModel.updateRanks().catch((error) => {
        console.error("Failed to update ranks:", error);
      });

      return {
        id: purchasedGift._id.toString(),
        name: purchasedGift.giftId.name,
        owner: ProfileMapper.toResponse(purchasedGift.ownerId),
        buyer: ProfileMapper.toResponse(purchasedGift.buyerId),
        price: {
          amount: purchasedGift.giftId.price.amount,
          token: purchasedGift.giftId.price.token,
        },
        slug: purchasedGift.giftId.slug,
        bgVariant: purchasedGift.giftId.attributes.bgVariant,
        boughtCount: purchasedGift.giftId.boughtCount,
        totalCount: purchasedGift.giftId.totalCount,
        createdAt: purchasedGift.giftId.createdAt,
        purchasedGift,
      };
    } finally {
      await session.endSession();
    }
  }
}
