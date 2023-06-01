import { AuditLogEvent, EmbedBuilder, GuildMember } from "discord.js";
import { Listener, SapphireClient } from "@sapphire/framework";
import { env, logger, prisma } from "../../index.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "guildMemberUpdate",
    });
  }

  public async run(oldMember: GuildMember, newMember: GuildMember) {
    const client: SapphireClient<true> = this.container.client;

    if (
      oldMember.communicationDisabledUntilTimestamp ===
      newMember.communicationDisabledUntilTimestamp
    )
      return;

    if (newMember.communicationDisabledUntilTimestamp !== null) return;

    const auditLog = (
      await newMember.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberUpdate,
        limit: 1,
      })
    ).entries.first();

    if (!auditLog) return;
    if (auditLog.targetId !== newMember.id) return;
    if (auditLog.executorId === client.user.id) return;

    const timeoutChange = auditLog.changes.find(
      (change) => change.key === "communication_disabled_until"
    );

    if (!timeoutChange) return;
    if (timeoutChange.new) return;

    const modCase = await prisma.case.findFirst({
      where: {
        AND: {
          memberId: newMember.id,
          type: "Timeout",
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

    const timeoutEndCase = await prisma.case.create({
      data: {
        reason: "[Discord] Timeout manually removed",
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
              userId: auditLog.executorId ?? "0",
            },
            create: {
              userId: auditLog.executorId ?? "0",
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

    const timeoutEndEmbed = new EmbedBuilder()
      .setAuthor({
        name: auditLog.executor?.tag ?? "Discord",
        iconURL:
          auditLog.executor?.displayAvatarURL({ forceStatic: true }) ??
          "https://cdn.discordapp.com/embed/avatars/0.png",
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${modCase.memberId}> (${
            newMember ? `\`${newMember.user.tag}\`` : "unknown user"
          })`,
          `${emojis.hammer} **Action**: Timeout End (timed out <t:${Math.floor(
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
  }
}
