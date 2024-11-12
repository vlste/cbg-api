import { App } from "../app";
import { FastifyReply, FastifyRequest } from "fastify";
import fs from "fs/promises";
import path from "path";

export class TgController {
  public app: App;
  private readonly CACHE_DIR = "cache/user-photos";

  constructor(app: App) {
    this.app = app;
    fs.mkdir(this.CACHE_DIR, { recursive: true }).catch(console.error);
  }

  getUserPhoto = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      if (!request.params.id) {
        return reply.badRequest();
      }

      const userId = request.params.id;
      const cacheFilePath = path.join(this.CACHE_DIR, `${userId}.jpg`);

      try {
        const cachedPhoto = await fs.readFile(cacheFilePath);
        reply.type("image/jpeg");
        return reply.send(cachedPhoto);
      } catch (err) {}

      let profilePhotos;
      try {
        profilePhotos = await this.app.bot.bot.api.getUserProfilePhotos(
          Number(userId)
        );
      } catch (err) {}

      if (!profilePhotos || profilePhotos.photos.length === 0) {
        const fallbackPhoto = await fs.readFile(
          path.join("static", "placeholder.png")
        );
        reply.type("image/png");
        return reply.send(fallbackPhoto);
      }

      const lastPhoto = profilePhotos.photos[0][0];
      const file = await this.app.bot.bot.api.getFile(lastPhoto.file_id);
      const filePath = file.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${this.app.bot.bot.token}/${filePath}`;

      const response = await fetch(fileUrl);
      if (!response.body) {
        const fallbackPhoto = await fs.readFile(
          path.join("static", "placeholder.png")
        );
        reply.type("image/png");
        return reply.send(fallbackPhoto);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(cacheFilePath, buffer);

      reply.type("image/jpeg");
      return reply.send(buffer);
    } catch (error) {
      console.error(error);
      return reply.serverError();
    }
  };
}
