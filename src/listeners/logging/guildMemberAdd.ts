import { EmbedBuilder, GuildMember } from "discord.js";
import { Listener } from "@sapphire/framework";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "guildMemberAdd",
    });
  }

  private generateColour(duration: number) {
    const percent = Math.min(
      duration / (2_419_200_000 /* 28 days */ / 100),
      100
    );
    let red;
    let green;
    let blue = 0;

    if (percent < 50) {
      red = 255;
      green = Math.round(5.1 * percent);
    } else {
      green = 255;
      red = Math.round(510 - 5.1 * percent);
    }

    const tintFactor = 0.3;

    red += (255 - red) * tintFactor;
    green += (255 - green) * tintFactor;
    blue += (255 - blue) * tintFactor;

    return Math.floor((red << 16) + (green << 8) + blue);
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
        ].join("\n")
      )
      .setColor(this.generateColour(Date.now() - member.user.createdTimestamp))
      .setFooter({ text: "Member Joined" })
      .setTimestamp();

    return logChannel.send({ embeds: [embed] });
  }
}
