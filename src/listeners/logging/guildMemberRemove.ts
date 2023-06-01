import { EmbedBuilder, GuildMember } from "discord.js";
import { Listener } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "guildMemberRemove",
    });
  }

  public async run(member: GuildMember) {
    const logChannel = await member.guild.channels.fetch(
      env.MEMBER_LOGS_CHANNEL_ID
    );

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    if (!member.joinedTimestamp) {
      throw new Error("Member joined timestamp is undefined/null.");
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${member.user.tag} (${member.user.id})`,
        iconURL: member.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${member.user.id}> (\`${member.user.tag}\`)`,
          `${emojis.plus} **Created**: <t:${Math.floor(
            member.user.createdTimestamp / 1000
          )}> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`,
          `${emojis.join} **Joined**: <t:${Math.floor(
            member.joinedTimestamp / 1000
          )}> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`,
          `${emojis.leave} **Left**: <t:${Math.floor(
            Date.now() / 1000
          )}> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
        ].join("\n")
      )
      .setColor(colours.darkModeBg)
      .setFooter({ text: "Member Left" })
      .setTimestamp();

    return logChannel.send({ embeds: [embed] });
  }
}
