import { IUser, UserModel } from "../models/user.model";

export class UserRepository {
  static async findByTelegramId(telegramId: number): Promise<IUser | null> {
    return UserModel.findOne({ telegramId });
  }

  static async create(userData: Partial<IUser>): Promise<IUser> {
    return UserModel.create(userData);
  }

  static async findOrCreate(userData: Partial<IUser>): Promise<IUser> {
    const existingUser = await this.findByTelegramId(userData.telegramId!);
    if (existingUser) {
      Object.assign(existingUser, userData);
      await existingUser.save();
      return existingUser;
    }
    return this.create(userData);
  }
}
