// TODO: for imgur.com image links, replace them with constants which are the image URLs.

import "dotenv/config";
import type { Channels, Guidelines, Roles } from "./types/process.js";
import { Prisma, PrismaClient } from "@prisma/client";
import Logger from "./utils/logger.js";
import { PresenceData } from "discord.js";
import { SapphireClient } from "@sapphire/framework";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import envVarCheck from "./utils/envVarCheck.js";
import intents from "./constants/intents.js";
import process from "node:process";

// Logger
export const logger: Logger = new Logger();
logger.info("Logger initialised.");
logger.info(`Using Node.js version ${process.versions.node}`);

// Environment variables
export const env = envVarCheck(process.env);
logger.info(`Node environment: ${env.nodeEnv}`);

// Dayjs plugins
dayjs.extend(duration);

// Prisma client
export const prisma = new PrismaClient();

try {
  logger.info("Connecting to Postgres database...");
  await prisma.$connect();
  logger.info("Connected to Postgres database.");
} catch (error) {
  logger.error("Could not connect to Postgres database.\n", error);
}

export const dbProcess = await prisma.process.findUnique({
  where: {
    type:
      env.nodeEnv === "DEVELOPMENT"
        ? "Development"
        : env.nodeEnv === "PRODUCTION"
        ? "Production"
        : "Other",
  },
});

// export type Channels = {
//   [key: string]: {
//     id: Snowflake;
//     channels: Array<{
//       [key: string]: Snowflake;
//     }>;
//   };
// };

let channelsObject: Channels | undefined;
let guidelinesArray: Guidelines | undefined;
let rolesObject: Roles | undefined;

if (!dbProcess) {
  logger.warn(
    "Could not find a valid process in the database. Refer to README setup for help."
  );
} else {
  logger.info(`Process in environment ${env.nodeEnv} found.`);

  // Get channels
  if (dbProcess?.channels && typeof dbProcess?.channels === "object") {
    channelsObject =
      dbProcess?.channels as Prisma.JsonObject as unknown as Channels;
  }

  if (channelsObject) {
    const totalCategories = Object.keys(channelsObject).length;
    // Get total number of channels
    let totalChannels = 0;
    for (const category in channelsObject) {
      totalChannels += Object.keys(category).length;
    }

    logger.info(
      `Found ${totalCategories} categories and ${totalChannels} channels in process.`
    );
  } else {
    logger.warn(`No channels found.`);
  }

  // Get guidelines
  if (dbProcess?.guidelines && typeof dbProcess?.guidelines === "object") {
    guidelinesArray =
      dbProcess?.guidelines as Prisma.JsonArray as unknown as Guidelines;

    if (guidelinesArray) {
      const totalGuidelines = guidelinesArray.length;
      logger.info(`Found ${totalGuidelines} guidelines in process.`);
    } else {
      logger.warn(`No guidelines found.`);
    }
  }

  // Get roles
  if (dbProcess?.roles && typeof dbProcess?.roles === "object") {
    rolesObject = dbProcess?.roles as Prisma.JsonObject as unknown as Roles;
  }

  if (rolesObject) {
    const totalRoles = Object.keys(rolesObject).length;
    logger.info(`Found ${totalRoles} roles in process.`);
  } else {
    logger.warn(`No roles found.`);
  }
}

export const channels = channelsObject;
export const guidelines = guidelinesArray;
export const roles = rolesObject;

// Sapphire client
let presence: PresenceData | undefined;
if (dbProcess?.activityName && dbProcess?.activityType) {
  presence = {
    activities: [
      {
        name: dbProcess.activityName,
        type: dbProcess.activityType,
      },
    ],
  };
}

export const client = new SapphireClient({
  intents,
  allowedMentions: {
    repliedUser: false,
  },
  presence,
});

client.login(env.botToken);

declare module "@sapphire/framework" {
  interface Command {
    requiredRoles?: (keyof Roles)[];
  }
}

// TODO: make sure to try {} catch {} upcomingExpiryHandler because of potential thrown errors
