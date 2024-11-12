import { Context, InlineQueryResultBuilder } from "grammy";
import { App } from "../../app";
import { GiftModel } from "../../models/gift.model";
import { IPurchasedGift } from "../../models/purchasedGift.model";
import { GiftTransferModel } from "../../models/giftTransfer.model";
import { UserModel } from "../../models/user.model";
import { InlineQuery } from "grammy/types";
import { env } from "../../config/env";

export class InlineQueryResultHandler {
  constructor(private readonly app: App) {}

  handleInlineQuery = async (ctx: Context & { inlineQuery: InlineQuery }) => {
    console.log(ctx.inlineQuery);
    const from = ctx.inlineQuery.from;
    const token = ctx.inlineQuery.query;

    const user = await UserModel.findOne({ telegramId: from.id });
    if (!user) {
      console.log("user not found");
      await ctx.answerInlineQuery([]);
      return;
    }

    console.log("user found", user._id);
    // console.log("token", token);
    const giftTransfer = await GiftTransferModel.findOne({
      senderId: user._id,
      sendToken: token,
    }).populate<{ purchasedGiftId: IPurchasedGift }>("purchasedGiftId");

    if (!giftTransfer) {
      console.log("gift transfer not found");
      await ctx.answerInlineQuery([]);
      return;
    }

    const gift = await GiftModel.findById(giftTransfer.purchasedGiftId.giftId);
    if (!gift) {
      console.log("gift not found");
      await ctx.answerInlineQuery([]);
      return;
    }

    const result = await this.buildSendGiftInlineQueryResult(
      ctx,
      {
        title: gift.name,
        image: "https://u2138.send.cm/i/04004/y4kqd9q1wj6d.png",
      },
      token
    );
    console.log("answer inline query", result);
    await ctx.answerInlineQuery([result]);
  };

  private async buildSendGiftInlineQueryResult(
    ctx: Context,
    gift: {
      title: string;
      image: string;
    },
    token: string
  ) {
    const TEXT = `🎁 I have a <b>${gift.title}</b> for you! Tap below to open it.`;
    const result = InlineQueryResultBuilder.article("1", "Send a Gift", {
      thumbnail_url: gift.image,
      description: `Send a gift of ${gift.title}`,
    }).text(TEXT, {
      parse_mode: "HTML",
    });

    result.reply_markup = {
      inline_keyboard: [
        [
          {
            text: "Receive Gift",
            url: `https://t.me/${env.TG_BOT_NAME}/app?startapp=receive-${token}`,
          },
        ],
      ],
    };
    return result;
  }
}
