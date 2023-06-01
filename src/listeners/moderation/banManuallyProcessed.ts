import { AuditLogEvent, EmbedBuilder, GuildBan } from "discord.js";
import { Listener, SapphireClient } from "@sapphire/framework";
import { env, logger, prisma } from "../../index.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "guildBanRemove",
    });
  }

  public async run(ban: GuildBan) {
    const client: SapphireClient<true> = this.container.client;

    const guild = await client.guilds.fetch(env.MAIN_GUILD_ID);
    if (!guild?.available) {
      throw new Error("Guild is not available or is undefined/null.");
    }

    const auditLog = (
      await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanRemove,
        limit: 1,
      })
    ).entries.first();

    if (!auditLog) return;
    if (auditLog.targetId !== ban.user.id) return;
    if (auditLog.executorId === client.user.id) return;

    const modCase = await prisma.case.findFirst({
      where: {
        AND: {
          memberId: ban.user.id,
          type: "Ban",
          processed: false,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!modCase) return;

    await prisma.case.update({
      where: {
        number: modCase.number,
      },
      data: {
        processed: true,
      },
    });

    const unbanCase = await prisma.case.create({
      data: {
        reason: "[Discord] Ban manually removed",
        type: "Unban",
        member: {
          connect: {
            userId: modCase.memberId,
          },
        },
        moderator: {
          connectOrCreate: {
            where: {
              userId: auditLog.executor?.id ?? "0",
            },
            create: {
              userId: auditLog.executor?.id ?? "0",
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

    const logChannel = await client.channels.fetch(env.MOD_LOGS_CHANNEL_ID);
    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    const unbanEmbed = new EmbedBuilder()
      .setAuthor({
        name: auditLog.executor?.tag ?? "Discord",
        iconURL:
          auditLog.executor?.displayAvatarURL({ forceStatic: true }) ??
          "https://cdn.discordapp.com/embed/avatars/0.png",
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${modCase.memberId}> (${
            ban.user ? `\`${ban.user.tag}\`` : "unknown user"
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
  }
}
