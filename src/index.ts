import "dotenv/config";
import * as routes from "./routes.js";
import { ActivityType, Partials } from "discord.js";
import Fastify from "fastify";
import Logger from "./utils/Logger.js";
import { PrismaClient } from "@prisma/client";
import { SapphireClient } from "@sapphire/framework";
import cors from "@fastify/cors";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import envVarCheck from "./utils/envVarCheck.js";
import helmet from "@fastify/helmet";
import intents from "./constants/intents.js";
import process from "node:process";
import relativeTime from "dayjs/plugin/relativeTime.js";

// Logger
export const logger: Logger = new Logger();
logger.info("Logger initialised.");
logger.info(`Using Node.js version ${process.versions.node}`);

// Environment variables
export const env = envVarCheck(process.env);
logger.info(`Node environment: ${env.NODE_ENV}`);

// Dayjs plugins
dayjs.extend(duration);
dayjs.extend(relativeTime);

// Prisma client
export const prisma = new PrismaClient();

try {
  logger.info("Connecting to database...");
  await prisma.$connect();
  logger.info("Connected to database.");
} catch (error) {
  logger.error("Could not connect to database.\n", error);
}

// Sapphire client
export const client = new SapphireClient({
  intents,
  presence: {
    activities: [
      {
        name: env.ACTIVITY_NAME,
        type: ActivityType[env.ACTIVITY_TYPE],
      },
    ],
  },
  partials: [Partials.Message, Partials.Reaction],
});

client.login(env.DISCORD_TOKEN);

// Fastify client
const fastify = Fastify();

await fastify.register(cors, {
  origin: "*",
});

await fastify.register(helmet);

for (const plugin of Object.values(routes)) {
  await fastify.register(plugin);
}

if (!parseInt(env.API_PORT)) {
  throw new Error("API_PORT environment variable must be a number.");
}

fastify.listen(
  { port: parseInt(env.API_PORT), host: "0.0.0.0" },
  (error, address) => {
    if (error) {
      logger.error(
        "An error occurred when trying to initialise the API:",
        error
      );
      process.exit(1);
    }

    logger.info(`API server listening at ${address}`);
  }
);
