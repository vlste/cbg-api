import { IGift } from "../models/gift.model";
import { IPurchasedGift } from "../models/purchasedGift.model";
import { IUser } from "../models/user.model";
import { BaseMapper } from "./base.mapper";

export interface ClientGift {
  id: string;
  name: string;
  price: {
    amount: number;
    token: string;
  };
  slug: string;
  bgVariant: number;
  boughtCount: number;
  totalCount: number;
  createdAt: Date;
}

export class GiftMapper extends BaseMapper {
  static toResponse(model: IGift): ClientGift {
    return {
      id: model._id.toString(),
      name: model.name,
      price: {
        amount: model.price.amount,
        token: model.price.token,
      },
      slug: model.slug,
      bgVariant: model.attributes.bgVariant,
      boughtCount: model.boughtCount,
      totalCount: model.totalCount,
      createdAt: model.createdAt,
    };
  }
}

export interface ClientProfile {
  id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  isPremium: boolean;
  rank: number;
  giftsReceived: number;
}

export class ProfileMapper extends BaseMapper {
  static toResponse(model: IUser): ClientProfile {
    return {
      id: model._id.toString(),
      telegramId: model.telegramId,
      username: model.username,
      firstName: model.firstName,
      lastName: model.lastName,
      isPremium: model.isPremium,
      rank: model.rank,
      giftsReceived: model.giftsReceived,
    };
  }
}
