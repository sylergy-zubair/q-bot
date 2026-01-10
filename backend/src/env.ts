import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().nonempty("DATABASE_URL is required"),
  OPENROUTER_API_KEY: z.string().nonempty("OPENROUTER_API_KEY is required"),
  OPENROUTER_MODEL: z.string().nonempty("OPENROUTER_MODEL is required"),
  OPENROUTER_API_URL: z
    .string()
    .url("OPENROUTER_API_URL must be a valid URL")
    .default("https://openrouter.ai/api/v1/chat/completions"),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_APP_NAME: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Failed to parse environment variables");
}

export const env = parsed.data;

