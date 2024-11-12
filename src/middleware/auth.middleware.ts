import { FastifyRequest, FastifyReply } from "fastify";
import { parse, validate } from "@telegram-apps/init-data-node";
import { env } from "../config/env";

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    if (
      request.url.match(/^\/tg\/user\/\d+\/photo$/) ||
      request.url.match(env.CRYPTO_BOT_WEBHOOK_PATH)
    ) {
      return;
    }
    const initData = request.headers["x-telegram-id"] as string;
    if (!initData) {
      return reply.status(401).send({ error: "Authentication failed" });
    }
    validate(initData, env.TG_BOT_TOKEN);
    const parsedInitData = parse(initData);
    if (!parsedInitData.user) {
      return reply.status(401).send({ error: "Authentication failed" });
    }
    request.user = {
      telegramId: parsedInitData.user?.id,
      firstName: parsedInitData.user?.firstName,
      lastName: parsedInitData.user?.lastName,
      username: parsedInitData.user?.username,
      isPremium: parsedInitData.user?.isPremium ?? false,
      isBot: parsedInitData.user?.isBot ?? false,
      languageCode: parsedInitData.user?.languageCode,
      allowsWriteToPm: parsedInitData.user?.allowsWriteToPm ?? false,
    };
  } catch (error) {
    console.log(JSON.stringify(request.headers, null, 2));
    console.log(error);
    return reply.status(401).send({ error: "Authentication failed" });
  }
};
