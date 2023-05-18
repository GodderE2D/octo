import { logger } from "../index.js";
import process from "node:process";

type env = {
  clientId: string;
  botToken: string;
  dbUrl: string;
  botOwnerId: string;
  guildId: string;
  nodeEnv: "DEVELOPMENT" | "PRODUCTION" | "OTHER";
};

const envVarCheck = (env: NodeJS.ProcessEnv = process.env): env => {
  if (!env.DISCORD_CLIENT_ID) {
    throw new Error(
      "The DISCORD_CLIENT_ID environment variable has not been set or is an empty string."
    );
  }

  if (!env.DISCORD_BOT_TOKEN) {
    throw new Error(
      "The DISCORD_BOT_TOKEN environment variable has not been set or is an empty string."
    );
  }

  if (!env.DB_CONNECTION_URL) {
    throw new Error(
      "The DB_CONNECTION_URL environment variable has not been set or is an empty string."
    );
  }

  if (!env.BOT_OWNER_USER_ID) {
    throw new Error(
      "The BOT_OWNER_USER_ID environment variable has not been set or is an empty string."
    );
  }

  if (!env.MAIN_SET_GUILD_ID) {
    throw new Error(
      "The MAIN_SET_GUILD_ID environment variable has not been set or is an empty string."
    );
  }

  let nodeEnv: "DEVELOPMENT" | "PRODUCTION" | "OTHER";

  switch (env.NODE_ENV) {
    case "development":
      nodeEnv = "DEVELOPMENT";
      break;
    case "production":
      nodeEnv = "PRODUCTION";
      break;
    default:
      nodeEnv = "OTHER";
      break;
  }

  logger.info("Environment variables are valid.");

  return {
    clientId: env.DISCORD_CLIENT_ID,
    botToken: env.DISCORD_BOT_TOKEN,
    dbUrl: env.DB_CONNECTION_URL,
    botOwnerId: env.BOT_OWNER_USER_ID,
    guildId: env.MAIN_SET_GUILD_ID,
    nodeEnv: nodeEnv,
  };
};

export default envVarCheck;
