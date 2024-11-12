import fastify, { FastifyRequest } from "fastify";
import { FastifyInstance } from "fastify";
import { env } from "../config/env";
import { App } from "../app";
import { TgController } from "../controllers/tg.controller";
import { GiftsController } from "../controllers/gifts.controller";
import { ProfileController } from "../controllers/profile.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { CryptoBotService } from "../services/cryptoBot.service";
import cors from "@fastify/cors";
import { replyDecorators } from "../plugins/reply-decorators";

export class Server {
  public fastifyApp: FastifyInstance;
  private app: App;

  constructor(app: App) {
    this.fastifyApp = fastify();
    this.app = app;
    this.applyRoutes();
  }

  public start() {
    console.log(`Server: starting (${env.PORT})`);
    this.fastifyApp.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  }

  private async applyRoutes() {
    const tgController = new TgController(this.app);
    const giftsController = new GiftsController(this.app);
    const profileController = new ProfileController(this.app);

    const router = this.fastifyApp;

    await router.register(cors, {
      origin: "*",
    });

    await router.register(replyDecorators);
    router.decorateRequest("user", null as any);
    router.addHook("preHandler", authMiddleware);

    router.get("/", async (request, reply) => {
      return reply.send("hey there");
    });

    router.get<{ Params: { id: string } }>(
      "/invoice/:id/check",
      async (request, reply) => {
        if (!request.params.id) {
          return reply.status(400).send({ error: "Invoice ID is required" });
        }

        const invoice = await CryptoBotService.getInvoice(request.params.id);
        const data = invoice.data;
        return reply.send(data);
      }
    );

    // Telegram
    router.get<{ Params: { id: string } }>(
      "/tg/user/:id/photo",
      tgController.getUserPhoto
    );

    // Gifts
    router.get("/gifts/store", giftsController.getStoreGifts);
    router.get("/gifts/my", giftsController.getMyGifts);
    router.get("/gifts/profile/:id", giftsController.getProfileReceivedGifts);
    router.post("/gifts/buy", giftsController.buyGift);
    router.post("/gifts/send", giftsController.sendGift);
    router.post("/gifts/receive", giftsController.receiveGift);
    router.get("/gifts/:id/actions", giftsController.getGiftRecentActions);
    router.get("/gifts/check-payment/:id", giftsController.checkPayment);

    // Profile
    router.get("/profile/:id", profileController.getProfile);
    router.get("/profile/:id/gifts", profileController.getProfileGifts);
    router.get(
      "/profile/:id/actions",
      profileController.getProfileRecentActions
    );
    router.get("/leaderboard", profileController.getLeaderboard);

    // Admin
    router.post("/gifts/create", giftsController.createGift);
    router.put("/gifts/:id", giftsController.updateGift);
    router.post(
      `/gifts/cryptobot/${env.CRYPTO_BOT_WEBHOOK_PATH}`,
      giftsController.cryptoPayWebhook
    );
  }
}
