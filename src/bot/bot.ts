import { Bot, Context, InlineQueryResultBuilder } from "grammy";
import { App } from "../app";
import { BasicCommandHandler } from "./handlers/BasicCommand.handler";
import { InlineQueryResultHandler } from "./handlers/InlineQueryResult.handler";
import { IPurchasedGift } from "../models/purchasedGift.model";
import { GiftModel, IGift } from "../models/gift.model";
import { IUser, UserModel } from "../models/user.model";
import { env } from "../config/env";

export class TelegramBot {
  public readonly bot: Bot;
  private app: App;

  constructor(token: string, app: App) {
    this.bot = new Bot(token);
    this.app = app;
    this.applyRoutes();
  }

  public start() {
    console.log("Telegram bot: starting");
    this.bot.start().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  }

  public async sendBoughtGiftNotification(
    userId: string,
    gift: IPurchasedGift & { giftId: IGift; ownerId: IUser }
  ) {
    await this.bot.api.sendMessage(
      userId,
      `✅ You have purchased a gift of <b>${gift.giftId.name}</b>`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open Gifts",
                url: `https://t.me/${env.TG_BOT_NAME}/app?startapp=gifts`,
              },
            ],
          ],
        },
        parse_mode: "HTML",
      }
    );
  }

  public async sendReceivedGiftNotification(
    userId: string,
    gift: IGift,
    receiver: IUser
  ) {
    const name = receiver.username
      ? `@${receiver.username}`
      : receiver.firstName;
    await this.bot.api.sendMessage(
      userId,
      `🌟 ${name} has received a gift (<b>${gift.name}</b>) from you!`,
      {
        parse_mode: "HTML",
      }
    );
  }

  private applyRoutes() {
    const basicCommandHandler = new BasicCommandHandler(this.app);
    const inlineQueryResultHandler = new InlineQueryResultHandler(this.app);

    this.bot.catch((err) => {
      console.error(err);
    });

    this.bot.command("start", basicCommandHandler.handleStart);
    this.bot.on("inline_query", inlineQueryResultHandler.handleInlineQuery);
  }
}
