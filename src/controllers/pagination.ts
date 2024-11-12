import { FastifyRequest } from "fastify";
import { z } from "zod";

export const pageSchema = z.object({
  page: z.string().regex(/^\d+$/).default("1"),
  limit: z.string().regex(/^\d+$/).default("20"),
});

export const parsePagination = (
  request: FastifyRequest
): { page: number; limit: number; skip: number } | null => {
  const result = pageSchema.safeParse(request.query);
  if (!result.success) {
    return null;
  }
  const page = parseInt(result.data.page);
  const limit = parseInt(result.data.limit);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};
