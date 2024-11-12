import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

export const replyDecorators: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateReply("badRequest", function (message = "Bad Request") {
    return this.status(400).send({ message });
  });

  fastify.decorateReply("notFound", function (message = "Not Found") {
    return this.status(404).send({ message });
  });

  fastify.decorateReply(
    "serverError",
    function (message = "Internal Server Error") {
      return this.status(500).send({ message });
    }
  );
});
