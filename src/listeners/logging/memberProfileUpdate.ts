import { EmbedBuilder, GuildMember } from "discord.js";
import { Listener } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "guildMemberUpdate",
    });
  }

  public async run(oldMember: GuildMember, newMember: GuildMember) {
    if (newMember.partial) await newMember.fetch();

    const nicknameChanged = oldMember.nickname !== newMember.nickname;
    const avatarChanged = oldMember.avatar !== newMember.avatar;

    if (!nicknameChanged && !avatarChanged) return;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${newMember.user.tag} (${newMember.user.id})`,
        iconURL: newMember.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${newMember.id}> (\`${newMember.user.tag}\`)`,
          nicknameChanged
            ? `${emojis.minus} **Old Nickname**: ${
                oldMember.nickname ? `\`${oldMember.nickname}\`` : "N/A"
              }`
            : undefined,
          nicknameChanged
            ? `${emojis.plus} **New Nickname**: ${
                newMember.nickname ? `\`${newMember.nickname}\`` : "N/A"
              }`
            : undefined,
          avatarChanged
            ? `${
                emojis.minus
              } **Old Avatar**: [link](${oldMember.user.displayAvatarURL()})`
            : undefined,
          avatarChanged
            ? `${
                emojis.plus
              } **New Avatar**: [link](${newMember.user.displayAvatarURL()})`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setThumbnail(avatarChanged ? newMember.displayAvatarURL() : null)
      .setColor(colours.green)
      .setFooter({
        text: `Server ${
          nicknameChanged
            ? "Nickname"
            : nicknameChanged && avatarChanged
            ? "Nickname & Avatar"
            : "Avatar"
        } Update`,
      })
      .setTimestamp();

    const logChannel = await newMember.guild.channels.fetch(
      env.PROFILE_LOGS_CHANNEL_ID
    );

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    return logChannel.send({ embeds: [embed] });
  }
}
