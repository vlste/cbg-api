import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3030),
  TG_BOT_TOKEN: z.string(),
  TG_BOT_NAME: z.string(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MONGODB_URL: z.string().default("mongodb://root:root@localhost:27017"),
  CRYPTO_BOT_API_KEY: z.string(),
  CRYPTO_BOT_BASE_URL: z.string(),
  CRYPTO_BOT_WEBHOOK_PATH: z.string(),
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  throw new Error("Invalid environment variables");
}

export const env = envParse.data;
