import { EmbedBuilder, GuildEmoji, MessageReaction, User } from "discord.js";
import { Listener } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "messageReactionAdd",
    });
  }

  public async run(reaction: MessageReaction, user: User) {
    if (reaction.partial) await reaction.fetch();
    if (!reaction.message.guild) return;

    let guildEmoji = null;

    if (reaction.emoji instanceof GuildEmoji) {
      guildEmoji = reaction.emoji;
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${user.tag} (${user.id})`,
        iconURL: user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${user.id}> (\`${user.tag}\`)`,
          `${emojis.edit} **Message**: [Jump to](${reaction.message.url}) (${reaction.message.channel.id})`,
          `${emojis.emoji} **Emoji**: ${
            reaction.emoji.id
              ? guildEmoji?.guild.id === reaction.message.guild.id
                ? `<:_:${reaction.emoji.id}>`
                : ""
              : decodeURIComponent(reaction.emoji.identifier)
          } ${reaction.emoji.id ? `[\`${reaction.emoji.name}\`] ` : ""}${
            reaction.emoji.id ? `(\`${reaction.emoji.id}\`)` : ""
          }`,
          guildEmoji
            ? `${emojis.discover} **Emoji Server**: \`${guildEmoji.guild.name}\` (\`${guildEmoji.guild.id}\`)`
            : "",
        ].join("\n")
      )
      .setThumbnail(reaction.emoji.url)
      .setColor(colours.green)
      .setFooter({ text: `Reaction Add` })
      .setTimestamp();

    const logChannel = await reaction.message.guild.channels.fetch(
      env.REACTION_LOGS_CHANNEL_ID
    );

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    return logChannel.send({ embeds: [embed] });
  }
}
