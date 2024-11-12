import { IUser } from "../models/user.model";

declare module "fastify" {
  export interface FastifyRequest {
    user: Pick<
      IUser,
      | "telegramId"
      | "username"
      | "firstName"
      | "lastName"
      | "isPremium"
      | "isBot"
      | "languageCode"
      | "allowsWriteToPm"
    >;
  }

  export interface FastifyReply {
    badRequest: () => FastifyReply;
    notFound: () => FastifyReply;
    serverError: () => FastifyReply;
  }
}
