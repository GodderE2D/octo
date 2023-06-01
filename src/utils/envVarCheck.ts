import { logger } from "../index.js";
import process from "node:process";
import { z } from "zod";

type Env = {
  DISCORD_CLIENT_ID: string;
  DISCORD_TOKEN: string;
  DB_CONNECTION_URL: string;
  BOT_OWNER_ID: string;
  MAIN_GUILD_ID: string;
  ACTIVITY_TYPE:
    | "Playing"
    | "Streaming"
    | "Listening"
    | "Watching"
    | "Competing";
  ACTIVITY_NAME: string;
  APPLICATIONS_CHANNEL_ID: string;
  TICKETS_CHANNEL_ID: string;
  MEMBERSHIP_LOGS_CHANNEL_ID: string;
  MOD_LOGS_CHANNEL_ID: string;
  MEMBER_LOGS_CHANNEL_ID: string;
  PROFILE_LOGS_CHANNEL_ID: string;
  MESSAGE_LOGS_CHANNEL_ID: string;
  REACTION_LOGS_CHANNEL_ID: string;
  VC_LOGS_CHANNEL_ID: string;
  NODE_ENV: "development" | "production" | "other";

  API_PORT: string;
  MC_ADMIN_LOGS_CHANNEL_ID: string;
  MC_API_KEY: string;
  MC_API_ALLOWED_IPS: string;
};

const envVarCheck = (env: NodeJS.ProcessEnv = process.env): Env => {
  const schema = z.object({
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_TOKEN: z.string(),
    DB_CONNECTION_URL: z.string(),
    BOT_OWNER_ID: z.string(),
    MAIN_GUILD_ID: z.string(),
    ACTIVITY_TYPE: z.enum([
      "Playing",
      "Streaming",
      "Listening",
      "Watching",
      "Competing",
    ]),
    ACTIVITY_NAME: z.string(),
    MEMBERSHIP_LOGS_CHANNEL_ID: z.string(),
    APPLICATIONS_CHANNEL_ID: z.string(),
    TICKETS_CHANNEL_ID: z.string(),
    MOD_LOGS_CHANNEL_ID: z.string(),
    MEMBER_LOGS_CHANNEL_ID: z.string(),
    PROFILE_LOGS_CHANNEL_ID: z.string(),
    MESSAGE_LOGS_CHANNEL_ID: z.string(),
    REACTION_LOGS_CHANNEL_ID: z.string(),
    VC_LOGS_CHANNEL_ID: z.string(),
    NODE_ENV: z.enum(["development", "production", "other"]),

    API_PORT: z.string(),
    MC_ADMIN_LOGS_CHANNEL_ID: z.string(),
    MC_API_KEY: z.string(),
    MC_API_ALLOWED_IPS: z.string(),
  });

  const parsedEnv = schema.parse(env);

  logger.info("Environment variables are valid.");

  return parsedEnv;
};

export default envVarCheck;
