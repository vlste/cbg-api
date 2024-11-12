import { Context } from "grammy";
import { App } from "../../app";
import { UserRepository } from "../../repositories/user.repository";
import { UserModel } from "../../models/user.model";
import { GiftReceiveService } from "../../services/giftReceive.service";
import { env } from "../../config/env";

export class BasicCommandHandler {
  constructor(private readonly app: App) {}

  handleStart = async (ctx: Context) => {
    const TEXT = "🎁 Here you can buy and send gifts to your friends!";

    if (!ctx.from) {
      return;
    }

    let user = await UserModel.findOne({
      telegramId: ctx.from.id,
    });

    if (!user) {
      user = await UserModel.create({
        telegramId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        isBot: ctx.from.is_bot,
        isPremium: ctx.from.is_premium,
        languageCode: ctx.from.language_code,
        registeredAt: new Date(),
      });
      UserModel.updateRanks().catch(console.error);
    } else {
      await user.updateOne({
        languageCode: ctx.from.language_code,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        isBot: ctx.from.is_bot,
        isPremium: ctx.from.is_premium,
        registeredAt: user.registeredAt ?? new Date(),
      });
    }

    if (
      ctx.match &&
      typeof ctx.match === "string" &&
      ctx.match.startsWith("receive-")
    ) {
      const split = ctx.match.split("-");
      if (split.length > 1) {
        const token = split[1];
        const gift = await GiftReceiveService.receiveGift(
          token,
          user.telegramId,
          this.app
        );

        if (gift) {
          await ctx.reply(
            `🎁 You have received a gift (<b>${gift.name}</b>) from @${gift.buyer.username}!`,
            {
              parse_mode: "HTML",
            }
          );
        }

        return;
      }
    }

    await ctx.api.sendPhoto(
      ctx.from.id,
      "https://u9750.send.cm/i/03996/74bawqckv9ss.png", // tmp
      {
        caption: TEXT,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Buy Gift",
                web_app: {
                  url: `https://t.me/${env.TG_BOT_NAME}/app`,
                },
              },
            ],
          ],
        },
      }
    );
  };
}
