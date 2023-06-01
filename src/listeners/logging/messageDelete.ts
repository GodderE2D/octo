import {
  AttachmentBuilder,
  AuditLogEvent,
  EmbedBuilder,
  Message,
} from "discord.js";
import { Buffer } from "buffer";
import { Listener } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "messageDelete",
    });
  }

  public async fetchAuditLogs(message: Message<true>) {
    const auditLog = await message.guild
      .fetchAuditLogs({
        type: AuditLogEvent.MessageDelete,
        limit: 1,
      })
      .catch(() => undefined);
    if (!auditLog) return;

    const entry = auditLog.entries.find(
      (entry) => Math.abs(entry.createdTimestamp - Date.now()) <= 2000
    );
    if (!entry) return;
    if (!message.partial) {
      if (entry.target.id !== message.author?.id) return;
      if (entry.extra.channel.id !== message.channel.id) return;
      if (!entry.executor) return;
    }

    const timeDifference = Math.abs(entry.createdTimestamp - Date.now());
    if (timeDifference > 2000) return;

    return {
      entry,
      timeDifference,
    };
  }

  public async run(message: Message) {
    if (!message.guild) return;

    const logChannel = await message.guild.channels.fetch(
      env.MESSAGE_LOGS_CHANNEL_ID
    );

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    const { entry, timeDifference } =
      (await this.fetchAuditLogs(message as Message<true>)) ?? {};

    const embed = new EmbedBuilder()
      .setAuthor({
        name: entry
          ? `${entry.executor?.tag} (${entry.executor?.id})`
          : message.author
          ? `${message.author.tag} (${message.author.id})`
          : "Unknown",
        iconURL: entry
          ? entry.executor?.displayAvatarURL({ forceStatic: true })
          : message.author?.displayAvatarURL({ forceStatic: true }) ??
            undefined,
      })
      .setDescription(
        [
          `${emojis.person} **Author**: ${
            message.author?.toString() ?? entry?.target.toString() ?? "Uncached"
          }${
            message.author?.tag || entry?.target.tag
              ? ` (\`${message.author?.tag ?? entry?.target.tag}\`)`
              : ""
          }`,
          `${emojis.hammer} **Action**: Message Delete (${
            entry ? "by moderator" : "self-delete/by bot"
          })`,
          `${emojis.channel} **Channel**: ${
            message.channel?.toString() ??
            entry?.extra.channel.toString() ??
            "Uncached"
          }`,
          timeDifference
            ? `${emojis.clock} **Audit Log vs Event Difference:** ${timeDifference}ms`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setColor(colours.error)
      .setFooter({
        text: `${
          message.partial
            ? "Uncached/partial message - data may not be accurate.\n"
            : ""
        }Message ID: ${message.id}`,
      })
      .setTimestamp();

    if (message.content) {
      embed.addFields({
        name: `${emojis.edit} Message content`,
        value: message.content
          ? message.content.length > 1024
            ? `See attached file (length: ${message.content.length})`
            : message.content
          : "N/A",
      });
    }

    if (message.attachments?.size > 0) {
      embed.addFields({
        name: `${emojis.link} Attachments`,
        value: message.attachments
          .map((attachment) => `[\`🔗 ${attachment.id}\`](${attachment.url})`)
          .join(", "),
      });
    }

    return await logChannel.send({
      embeds: [embed],
      files:
        message.content?.length > 1024
          ? [
              new AttachmentBuilder(Buffer.from(message.content, "utf-8"), {
                name: `user_message_${message.id}.txt`,
              }),
            ]
          : [],
    });
  }
}
