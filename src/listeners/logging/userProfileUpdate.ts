import { EmbedBuilder, User } from "discord.js";
import { Listener } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "userUpdate",
    });
  }

  public async run(oldUser: User, newUser: User) {
    if (newUser.partial) await newUser.fetch();

    const tagChanged = oldUser.tag !== newUser.tag;
    const avatarChanged = oldUser.avatar !== newUser.avatar;

    if (!tagChanged && !avatarChanged) return;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${newUser.tag} (${newUser.id})`,
        iconURL: newUser.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${newUser.id}> (\`${newUser.tag}\`)`,
          tagChanged
            ? `${emojis.minus} **Old Tag**: ${
                oldUser.tag ? `\`${oldUser.tag}\`` : "N/A"
              }`
            : undefined,
          tagChanged
            ? `${emojis.plus} **New Tag**: ${
                newUser.tag ? `\`${newUser.tag}\`` : "N/A"
              }`
            : undefined,
          avatarChanged
            ? `${
                emojis.minus
              } **Old Avatar**: [link](${oldUser.displayAvatarURL()})`
            : undefined,
          avatarChanged
            ? `${
                emojis.plus
              } **New Avatar**: [link](${newUser.displayAvatarURL()})`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setThumbnail(avatarChanged ? newUser.displayAvatarURL() : null)
      .setColor(colours.green)
      .setFooter({
        text: `Global ${
          tagChanged
            ? "Tag"
            : tagChanged && avatarChanged
            ? "Tag & Avatar"
            : "Avatar"
        } Update`,
      })
      .setTimestamp();

    const logChannel = await newUser.client.channels.fetch(
      env.PROFILE_LOGS_CHANNEL_ID
    );

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    return logChannel.send({ embeds: [embed] });
  }
}
