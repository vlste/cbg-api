import { FastifyReply, FastifyRequest } from "fastify";
import { App } from "../app";
import { IPrice } from "../models/types";
import { GiftModel, IGift } from "../models/gift.model";
import { z } from "zod";
import { CryptoBotService } from "../services/cryptoBot.service";
import { GiftMapper, ProfileMapper } from "../mappers/mappers";
import { InvoiceModel, InvoiceStatus } from "../models/invoice.model";
import { IUser, UserModel } from "../models/user.model";
import {
  GiftTransferModel,
  GiftTransferStatus,
} from "../models/giftTransfer.model";
import { ActivityModel, ActivityType } from "../models/activity.model";
import {
  IPurchasedGift,
  PurchasedGiftModel,
  PurchasedGiftStatus,
} from "../models/purchasedGift.model";
import { parsePagination } from "./pagination";
import { randomBytes } from "crypto";
import { GiftReceiveService } from "../services/giftReceive.service";
import { PaymentService } from "../services/payment.service";

export class GiftsController {
  constructor(private readonly app: App) {}

  getStoreGifts = async (request: FastifyRequest, reply: FastifyReply) => {
    const pagination = parsePagination(request);

    if (!pagination) {
      return reply.badRequest();
    }

    const { page, limit, skip } = pagination;

    const [gifts, total] = await Promise.all([
      GiftModel.find({
        isActive: true,
        $expr: { $lt: ["$boughtCount", "$totalCount"] },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      GiftModel.countDocuments({
        isActive: true,
        $expr: { $lt: ["$boughtCount", "$totalCount"] },
      }),
    ]);

    return reply.send(
      GiftMapper.toPaginatedResponse(gifts, total, page, limit)
    );
  };

  getGiftRecentActions = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const pagination = parsePagination(request);

    if (!pagination) {
      return reply.badRequest();
    }

    const { page, limit, skip } = pagination;
    const { id } = request.params;

    if (!id) {
      return reply.badRequest();
    }

    try {
      const gift = await GiftModel.findById(id);
      if (!gift) {
        return reply.notFound();
      }

      const [actions, total] = await Promise.all([
        ActivityModel.find({
          giftId: gift._id,
        })
          .populate<{
            actorId: IUser;
            targetId: IUser;
            giftId: IGift;
            purchasedGiftId: IPurchasedGift;
          }>(["actorId", "targetId", "giftId", "purchasedGiftId"])
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),

        ActivityModel.countDocuments({
          giftId: gift._id,
        }),
      ]);

      const actionsWithGift = actions.map((action) => ({
        type: action.type,
        actor: ProfileMapper.toResponse(action.actorId),
        target: ProfileMapper.toResponse(action.targetId),
        gift: GiftMapper.toResponse(gift),
        createdAt: action.createdAt,
      }));

      return reply.send({
        data: actionsWithGift,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to get gift recent actions:", error);
      return reply.serverError();
    }
  };

  getMyGifts = async (request: FastifyRequest, reply: FastifyReply) => {
    const pagination = parsePagination(request);

    if (!pagination) {
      return reply.badRequest();
    }

    const { page, limit, skip } = pagination;

    try {
      const user = await UserModel.findOne({
        telegramId: request.user.telegramId,
      });

      if (!user) {
        return reply.notFound();
      }

      const [purchasedGifts, total] = await Promise.all([
        PurchasedGiftModel.find({
          ownerId: user._id,
          buyerId: user._id,
          status: PurchasedGiftStatus.AVAILABLE,
        }).populate<{
          giftId: IGift;
          ownerId: IUser;
          buyerId: IUser;
        }>(["giftId", "ownerId", "buyerId"]),

        PurchasedGiftModel.countDocuments({
          ownerId: user._id,
          buyerId: user._id,
          status: PurchasedGiftStatus.AVAILABLE,
        }),
      ]);

      const mapped = purchasedGifts.map((purchasedGift) => ({
        id: purchasedGift._id.toString(),
        name: purchasedGift.giftId.name,
        owner: ProfileMapper.toResponse(purchasedGift.ownerId),
        buyer: ProfileMapper.toResponse(purchasedGift.buyerId),
        boughtAt: purchasedGift.boughtAt,
        price: {
          amount: purchasedGift.giftId.price.amount,
          token: purchasedGift.giftId.price.token,
        },
        slug: purchasedGift.giftId.slug,
        bgVariant: purchasedGift.giftId.attributes.bgVariant,
        boughtCount: purchasedGift.giftId.boughtCount,
        totalCount: purchasedGift.giftId.totalCount,
        createdAt: purchasedGift.giftId.createdAt,
      }));

      return reply.send({
        data: mapped,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to get my gifts:", error);
      return reply.serverError();
    }
  };

  getProfileReceivedGifts = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const pagination = parsePagination(request);

    if (!pagination) {
      return reply.badRequest();
    }

    const { page, limit, skip } = pagination;

    const { id } = request.params;
    if (!id) {
      return reply.badRequest();
    }

    const telegramId = Number(id);
    if (isNaN(telegramId)) {
      return reply.badRequest();
    }

    try {
      const user = await UserModel.findOne({ telegramId });
      if (!user) {
        return reply.notFound();
      }

      const [purchasedGifts, total] = await Promise.all([
        PurchasedGiftModel.find({
          ownerId: user._id,
          status: PurchasedGiftStatus.GIFTED,
        })
          .populate<{
            giftId: IGift;
            ownerId: IUser;
            buyerId: IUser;
          }>(["giftId", "ownerId", "buyerId"])
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),

        PurchasedGiftModel.countDocuments({
          ownerId: user._id,
          status: PurchasedGiftStatus.GIFTED,
        }),
      ]);

      const mapped = purchasedGifts.map((purchasedGift) => ({
        id: purchasedGift._id.toString(),
        name: purchasedGift.giftId.name,
        owner: ProfileMapper.toResponse(purchasedGift.ownerId),
        buyer: ProfileMapper.toResponse(purchasedGift.buyerId),
        boughtAt: purchasedGift.boughtAt,
        price: {
          amount: purchasedGift.giftId.price.amount,
          token: purchasedGift.giftId.price.token,
        },
        slug: purchasedGift.giftId.slug,
        bgVariant: purchasedGift.giftId.attributes.bgVariant,
        boughtCount: purchasedGift.giftId.boughtCount,
        totalCount: purchasedGift.giftId.totalCount,
        createdAt: purchasedGift.giftId.createdAt,
      }));

      return reply.send({
        data: mapped,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to get profile received gifts:", error);
      return reply.serverError();
    }
  };

  buyGift = async (request: FastifyRequest, reply: FastifyReply) => {
    const buyGiftSchema = z.object({
      giftId: z.string().min(1),
    });

    const result = buyGiftSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    const { giftId } = result.data;

    try {
      const gift = await GiftModel.findById(giftId);

      if (!gift) {
        return reply.status(404).send({ message: "Gift not found" });
      }

      if (!gift.isActive) {
        return reply.status(400).send({ message: "Gift is not available" });
      }

      if (gift.boughtCount >= gift.totalCount) {
        return reply.status(400).send({ message: "Gift is out of stock" });
      }

      const invoice = await CryptoBotService.createInvoice({
        amount: gift.price.amount,
        token: gift.price.token,
        expiresIn: 30,
      });

      if (!invoice) {
        return reply.status(500).send({ message: "Failed to create invoice" });
      }

      const user = await UserModel.findOne({
        telegramId: request.user.telegramId,
      });

      if (!user) {
        return reply.status(404).send({ message: "User not found" });
      }

      const session = await InvoiceModel.startSession();
      try {
        // Aquire gift while invoice is pending
        // If PAID -> ok
        // If EXPIRED -> release gift
        await session.withTransaction(async () => {
          await GiftModel.findByIdAndUpdate(
            giftId,
            {
              $inc: { boughtCount: 1 },
            },
            { session }
          );
          await InvoiceModel.create(
            [
              {
                invoiceId: invoice.invoice_id,
                info: {
                  hash: invoice.hash,
                  miniAppURL: invoice.mini_app_invoice_url,
                },
                giftId: gift._id,
                userId: user._id,
                price: gift.price,
                status: InvoiceStatus.PENDING,
                lastCheckedAt: new Date(),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 1),
              },
            ],
            { session }
          );
        });

        return reply.send({
          paymentUrl: invoice.mini_app_invoice_url,
          invoiceId: invoice.invoice_id,
        });
      } catch (error) {
        console.error("Failed to process gift purchase:", error);
        return reply
          .status(500)
          .send({ message: "Failed to process purchase" });
      } finally {
        await session.endSession();
      }
    } catch (error) {
      console.error("Failed to process gift purchase:", error);
      return reply.status(500).send({ message: "Failed to process purchase" });
    }
  };

  sendGift = async (request: FastifyRequest, reply: FastifyReply) => {
    const sendGiftSchema = z.object({
      purchasedGiftId: z.string().min(1),
    });

    const result = sendGiftSchema.safeParse(request.body);

    if (!result.success) {
      return reply.badRequest();
    }

    const { purchasedGiftId } = result.data;

    try {
      const user = await UserModel.findOne({
        telegramId: request.user.telegramId,
      });

      if (!user) {
        return reply.notFound();
      }

      const purchasedGift = await PurchasedGiftModel.findOne({
        _id: purchasedGiftId,
        buyerId: user._id,
        status: PurchasedGiftStatus.AVAILABLE,
      });

      if (!purchasedGift) {
        return reply.status(404).send({ message: "Purchased gift not found" });
      }

      const existingTransfer = await GiftTransferModel.findOne({
        purchasedGiftId: purchasedGift._id,
      });

      if (existingTransfer) {
        return reply.send({
          sendToken: existingTransfer.sendToken,
        });
      }

      const token = randomBytes(6).toString("hex");

      const transfer = await GiftTransferModel.create({
        purchasedGiftId: purchasedGift._id,
        status: GiftTransferStatus.PENDING,
        senderId: user._id,
        sendToken: token,
      });

      return reply.send({
        sendToken: token,
      });
    } catch (error) {
      console.error("Failed to send gift:", error);
      return reply.serverError();
    }
  };

  receiveGift = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const receiveGiftSchema = z.object({
        token: z.string().min(1),
      });

      const result = receiveGiftSchema.safeParse(request.body);

      if (!result.success) {
        return reply.badRequest();
      }

      const { token } = result.data;

      const gift = await GiftReceiveService.receiveGift(
        token,
        request.user.telegramId,
        this.app
      );

      return reply.send({
        success: true,
        gift,
      });
    } catch (error) {
      console.error("Failed to receive gift:", error);
      return reply.notFound();
    }
  };

  checkPayment = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;

    if (!id) {
      return reply.badRequest();
    }

    try {
      const dbInvoice = await InvoiceModel.findOne({ invoiceId: id });
      if (!dbInvoice) {
        return reply.notFound();
      }

      const user = await UserModel.findOne({
        telegramId: request.user.telegramId,
      });

      if (!user) {
        return reply.notFound();
      }

      if (dbInvoice.userId.toString() !== user._id.toString()) {
        return reply.notFound();
      }

      return reply.send({
        status: dbInvoice.status,
      });
    } catch (error) {
      return reply.notFound();
    }
  };

  // ADMIN
  createGift = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user.telegramId || request.user.telegramId !== 64054676) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const createGiftSchema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      attributes: z.object({
        bgVariant: z.number().int().positive(),
      }),
      price: z.object({
        amount: z.number().positive(),
        token: z.enum(["USDT", "TON", "ETH"]),
      }),
      totalCount: z.number().int().positive(),
    });

    const result = createGiftSchema.safeParse(request.body);

    if (!result.success) {
      return reply.badRequest();
    }

    const { name, slug, attributes, price, totalCount } = result.data;

    try {
      const gift = await GiftModel.create({
        name,
        slug,
        attributes,
        price,
        totalCount,
      });

      return reply.status(201).send(GiftMapper.toResponse(gift));
    } catch (error) {
      console.error("Failed to create gift:", error);
      return reply.serverError();
    }
  };

  updateGift = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    if (!request.user.telegramId || request.user.telegramId !== 64054676) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const updateGiftSchema = z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      attributes: z
        .object({
          bgVariant: z.number().int().positive(),
        })
        .optional(),
      price: z
        .object({
          amount: z.number().positive(),
          token: z.enum(["USDT", "TON", "ETH"]),
        })
        .optional(),
      availableCount: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    });

    if (!request.params.id) {
      return reply.badRequest();
    }

    const result = updateGiftSchema.safeParse(request.body);

    if (!result.success) {
      return reply.badRequest();
    }

    const { name, slug, attributes, price, availableCount, isActive } =
      result.data;

    const gift = await GiftModel.findByIdAndUpdate(
      request.params.id,
      {
        name,
        slug,
        attributes,
        price,
        availableCount,
        isActive,
      },
      { new: true }
    );

    return reply.send(gift);
  };

  cryptoPayWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
    console.log("cryptoPayWebhook", request.body);

    const { update_type, payload } = request.body as any;

    if (!update_type || !payload) {
      console.log("cryptoPayWebhook bad request", request.body);
      return reply.send({ success: true });
    }

    if (update_type !== "invoice_paid") {
      return reply.send({ success: true });
    }

    try {
      const invoice = payload;
      const dbInvoice = await InvoiceModel.findOne({
        invoiceId: invoice.invoice_id,
      });
      if (!dbInvoice) {
        console.log("cryptoPayWebhook invoice not found", request.body);
        return reply.serverError();
      }

      await PaymentService.handlePaidInvoice(invoice, dbInvoice, this.app);
    } catch (error) {
      console.error("Failed to handle paid invoice:", error);
      return reply.serverError();
    }

    return reply.send({ success: true });
  };
}
