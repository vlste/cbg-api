import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify";
import { App } from "../app";
import { UserRepository } from "../repositories/user.repository";
import { GiftMapper, ProfileMapper } from "../mappers/mappers";
import { ActivityModel, ActivityType } from "../models/activity.model";
import { IUser, UserModel } from "../models/user.model";
import { GiftModel, IGift } from "../models/gift.model";
import { PurchasedGiftModel } from "../models/purchasedGift.model";
import { z } from "zod";
import { parsePagination } from "./pagination";

export class ProfileController {
  constructor(private readonly app: App) {}

  getProfile = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    if (!request.params.id) {
      return reply.badRequest();
    }

    const telegramId = Number(request.params.id);
    if (isNaN(telegramId)) {
      return reply.badRequest();
    }

    try {
      let user = await UserModel.findOne({ telegramId });

      if (!user) {
        user = await UserModel.create({
          telegramId,
          languageCode: request.user.languageCode,
          username: request.user.username,
          firstName: request.user.firstName,
          lastName: request.user.lastName,
          isBot: request.user.isBot,
          isPremium: request.user.isPremium,
          registeredAt: new Date(),
        });
        UserModel.updateRanks();
      }

      if (!user) {
        return reply.notFound();
      }

      const mappedUser = ProfileMapper.toResponse(user);

      const giftsReceived = await ActivityModel.countDocuments({
        targetId: user._id,
        type: ActivityType.GIFT_SENT,
      });

      return reply.send({
        ...mappedUser,
        giftsReceived,
      });
    } catch (error) {
      console.error("Failed to get user profile:", error);
      return reply.serverError();
    }
  };

  getProfileGifts = async (
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: string; limit?: string };
    }>,
    reply: FastifyReply
  ) => {
    const pageSchema = z.object({
      page: z.string().regex(/^\d+$/).default("1"),
      limit: z.string().regex(/^\d+$/).default("10"),
    });

    const result = pageSchema.safeParse(request.query);

    if (!result.success) {
      return reply
        .status(400)
        .send({ message: "Invalid pagination parameters" });
    }

    if (!request.params.id) {
      return reply.badRequest();
    }

    const telegramId = Number(request.params.id);
    if (isNaN(telegramId)) {
      return reply.badRequest();
    }

    try {
      const user = await UserModel.findOne({ telegramId });
      if (!user) {
        return reply.notFound();
      }

      const page = parseInt(result.data.page);
      const limit = parseInt(result.data.limit);
      const skip = (page - 1) * limit;

      const [gifts, total] = await Promise.all([
        PurchasedGiftModel.find({ ownerId: user._id })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        PurchasedGiftModel.countDocuments({ ownerId: user._id }),
      ]);

      return reply.send({
        data: gifts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to get user gifts:", error);
      return reply.serverError();
    }
  };

  getProfileRecentActions = async (
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: string; limit?: string };
    }>,
    reply: FastifyReply
  ) => {
    const pageSchema = z.object({
      page: z.string().regex(/^\d+$/).default("1"),
      limit: z.string().regex(/^\d+$/).default("10"),
    });

    const result = pageSchema.safeParse(request.query);

    if (!result.success) {
      return reply
        .status(400)
        .send({ message: "Invalid pagination parameters" });
    }

    if (!request.params.id) {
      return reply.badRequest();
    }

    const telegramId = Number(request.params.id);
    if (isNaN(telegramId)) {
      return reply.badRequest();
    }

    try {
      const user = await UserModel.findOne({ telegramId });
      if (!user) {
        return reply.notFound();
      }

      const page = parseInt(result.data.page);
      const limit = parseInt(result.data.limit);
      const skip = (page - 1) * limit;

      const [actions, total] = await Promise.all([
        ActivityModel.find({
          $or: [{ actorId: user._id }, { targetId: user._id }],
        })
          .populate<{ actorId: IUser; targetId: IUser; giftId: IGift }>([
            "actorId",
            "targetId",
            "giftId",
          ])
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        ActivityModel.countDocuments({
          $or: [{ actorId: user._id }, { targetId: user._id }],
        }),
      ]);

      const mappedActions = actions.map((action) => ({
        type: action.type,
        actor: ProfileMapper.toResponse(action.actorId),
        target: ProfileMapper.toResponse(action.targetId),
        gift: action.giftId ? GiftMapper.toResponse(action.giftId) : undefined,
        purchaseMetadata: action.purchaseMetadata,
        createdAt: action.createdAt,
      }));

      return reply.send({
        data: mappedActions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to get user recent actions:", error);
      return reply.serverError();
    }
  };

  getLeaderboard = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pagination = parsePagination(request);

      if (!pagination) {
        return reply.badRequest();
      }

      const { page, skip, limit } = pagination;

      const [users, total] = await Promise.all([
        UserModel.find({}).sort({ rank: 1 }).skip(skip).limit(limit),
        UserModel.countDocuments({}),
      ]);

      return reply.send({
        data: users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to get leaderboard:", error);
      return reply.serverError();
    }
  };
}
