import { AttachmentBuilder, EmbedBuilder, Message } from "discord.js";
import { Buffer } from "buffer";
import { Listener } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "messageUpdate",
    });
  }

  public async run(oldMessage: Message, newMessage: Message) {
    if (oldMessage.partial) await oldMessage.fetch();
    if (newMessage.partial) await newMessage.fetch();

    if (!newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;

    const logChannel = await newMessage.guild.channels.fetch(
      env.MESSAGE_LOGS_CHANNEL_ID
    );

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${newMessage.author.tag} (${newMessage.author.id})`,
        iconURL: newMessage.author.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Author**: <@${newMessage.author.id}> (\`${newMessage.author.tag}\`)`,
          `${emojis.hammer} **Action**: Message Edit`,
          `${emojis.channel} **Channel**: <#${newMessage.channel.id}>`,
        ].join("\n")
      )
      .addFields(
        {
          name: `${emojis.edit} Old message content`,
          value: oldMessage.content
            ? oldMessage.content.length > 1024
              ? `*See attached file (length: ${oldMessage.content.length})*`
              : oldMessage.content
            : "*Message content was not cached*",
        },
        {
          name: `${emojis.edit} New message content`,
          value: newMessage
            ? newMessage.content.length > 1024
              ? `*See attached file (length: ${newMessage.content.length})*`
              : `${newMessage.content}`
            : "*Message content was not cached*",
        }
      )
      .setColor(colours.warning)
      .setFooter({ text: `Message ID: ${newMessage.id}` })
      .setTimestamp();

    if (newMessage.attachments.size > 0) {
      embed.addFields(
        {
          name: `${emojis.link} Old attachments`,
          value: oldMessage.attachments
            .map((attachment) => `[\`🔗 ${attachment.id}\`](${attachment.url})`)
            .join(", "),
          inline: true,
        },
        {
          name: `${emojis.link} New attachments`,
          value: newMessage.attachments
            .map((attachment) => `[\`🔗 ${attachment.id}\`](${attachment.url})`)
            .join(", "),
          inline: true,
        }
      );
    }

    const files: AttachmentBuilder[] = [];

    if (oldMessage.content?.length > 1024) {
      files.push(
        new AttachmentBuilder(Buffer.from(oldMessage.content, "utf-8"), {
          name: `old_user_message_${oldMessage.id}.txt`,
        })
      );
    }

    if (newMessage.content?.length > 1024) {
      new AttachmentBuilder(Buffer.from(newMessage.content, "utf-8"), {
        name: `new_user_message_${newMessage.id}.txt`,
      });
    }

    return await logChannel.send({
      embeds: [embed],
      files,
    });
  }
}
