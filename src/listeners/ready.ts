import { Listener, SapphireClient } from "@sapphire/framework";
import { env, logger } from "../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
    });
  }
  public async run(client: SapphireClient<true>) {
    logger.info("Bot is ready.");

    if (client.user.id !== env.DISCORD_CLIENT_ID) {
      logger.warn(`User id does not match client id set in environment.`);
      logger.warn(`Expected: ${env.DISCORD_CLIENT_ID}`);
    }

    logger.info(`Logged in as ${client.user?.tag} (${client.user?.id}).`);

    const guild = client.guilds.cache.get(env.MAIN_GUILD_ID);
    if (guild) {
      logger.info(`Found main guild: ${guild.name} (${guild.id}).`);
      if (!guild.available) {
        logger.warn("Guild is not available. Many features may not work.");
      }
    } else {
      logger.warn(
        "Guild set in environment not found in cache. Not registering guild commands."
      );
    }

    logger.info("All startup tests done.");

    client.guilds.cache.get(env.MAIN_GUILD_ID)?.members.fetch();
  }
}
