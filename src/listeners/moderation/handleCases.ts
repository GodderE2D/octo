import { Listener, SapphireClient } from "@sapphire/framework";
import { env, logger, prisma } from "../../index.js";
import { EmbedBuilder } from "discord.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { setInterval } from "node:timers";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
    });
  }

  private async handle(client: SapphireClient<true>) {
    const unprocessedCases = await prisma.case.findMany({
      where: {
        processed: false,
      },
    });

    for (const modCase of unprocessedCases) {
      if (!modCase.duration || modCase.duration === -1) continue;
      if (modCase.createdAt.getTime() + modCase.duration > Date.now()) continue;

      const logChannel = await client.channels.fetch(env.MOD_LOGS_CHANNEL_ID);

      if (!logChannel?.isTextBased()) {
        throw new Error("Channel is not text based or is undefined/null.");
      }

      const user = await client.users
        .fetch(modCase.memberId)
        .catch(() => undefined);

      const guild = await client.guilds.fetch(env.MAIN_GUILD_ID);

      if (!guild?.available) {
        throw new Error("Guild is not available or is undefined/null.");
      }

      switch (modCase.type) {
        case "Ban": {
          if (!guild.members.me?.permissions.has("BanMembers")) {
            logger.error(
              "Bot does not have permission to ban members when attempting to unban a user."
            );
            continue;
          }

          await guild.bans.remove(
            modCase.memberId,
            `Original Case ${modCase.number} • [Automod] Ban expired`
          );

          const unbanCase = await prisma.case.create({
            data: {
              reason: "[Automod] Ban expired",
              type: "Unban",
              member: {
                connect: {
                  userId: modCase.memberId,
                },
              },
              moderator: {
                // connectOrCreate is used because the bot's member object may not be in the database
                connectOrCreate: {
                  where: {
                    userId: client.user?.id,
                  },
                  create: {
                    userId: client.user?.id,
                  },
                },
              },
              reference: {
                connect: {
                  number: modCase.number,
                },
              },
            },
          });

          await prisma.case.update({
            where: {
              number: modCase.number,
            },
            data: {
              processed: true,
            },
          });

          const unbanEmbed = new EmbedBuilder()
            .setAuthor({
              name: "Octo",
              iconURL: client.user?.displayAvatarURL({ forceStatic: true }),
            })
            .setDescription(
              [
                `${emojis.person} **Member**: <@${modCase.memberId}> (${
                  user ? `\`${user.tag}\`` : "unknown user"
                })`,
                `${emojis.hammer} **Action**: Unban (banned <t:${Math.floor(
                  modCase.createdAt.getTime() / 1000
                )}:R>)`,
                `${emojis.edit} **Reason**: ${unbanCase.reason}`,
                modCase.logMessageLink
                  ? `${emojis.link} **Case Reference**: [#${modCase.number}](${modCase.logMessageLink}) (Ban)`
                  : "",
              ].join("\n")
            )
            .setColor(colours.darkModeBg)
            .setFooter({
              text: `Case #${unbanCase.number}`,
            })
            .setTimestamp();

          await logChannel.send({
            embeds: [unbanEmbed],
          });

          break;
        }
        case "Timeout": {
          if (!guild.members.me?.permissions.has("ModerateMembers")) {
            logger.error(
              "Bot does not have permission to moderate members when attempting to end a user's timeout."
            );
            continue;
          }

          const timeoutEndCase = await prisma.case.create({
            data: {
              reason: "[Discord] Timeout expired",
              type: "TimeoutEnd",
              member: {
                connect: {
                  userId: modCase.memberId,
                },
              },
              moderator: {
                // connectOrCreate is used because the bot's member object may not be in the database
                connectOrCreate: {
                  where: {
                    userId: client.user?.id,
                  },
                  create: {
                    userId: client.user?.id,
                  },
                },
              },
              reference: {
                connect: {
                  number: modCase.number,
                },
              },
            },
          });

          await prisma.case.update({
            where: {
              number: modCase.number,
            },
            data: {
              processed: true,
            },
          });

          const timeoutEndEmbed = new EmbedBuilder()
            .setAuthor({
              name: "Discord",
              iconURL: "https://cdn.discordapp.com/embed/avatars/0.png",
            })
            .setDescription(
              [
                `${emojis.person} **Member**: <@${modCase.memberId}> (${
                  user ? `\`${user.tag}\`` : "unknown user"
                })`,
                `${
                  emojis.hammer
                } **Action**: Timeout End (timed out <t:${Math.floor(
                  modCase.createdAt.getTime() / 1000
                )}:R>)`,
                `${emojis.edit} **Reason**: ${timeoutEndCase.reason}`,
                modCase.logMessageLink
                  ? `${emojis.link} **Case Reference**: [#${modCase.number}](${modCase.logMessageLink}) (Timeout)`
                  : "",
              ].join("\n")
            )
            .setColor(colours.darkModeBg)
            .setFooter({
              text: `Case #${timeoutEndCase.number}`,
            })
            .setTimestamp();

          await logChannel.send({
            embeds: [timeoutEndEmbed],
          });

          break;
        }
      }
    }
  }

  public async run(client: SapphireClient<true>) {
    setInterval(() => this.handle(client), 5000);
  }
}
