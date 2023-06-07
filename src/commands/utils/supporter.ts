import { ApplicationCommandType, EmbedBuilder } from "discord.js";
import { ChatInputCommand, Command } from "@sapphire/framework";
import { env, prisma } from "../../index.js";
import { isGuildMember, isTextChannel } from "@sapphire/discord.js-utilities";
import axios from "axios";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "supporter",
      description: "Grant a user the Supporter rank for 1 day.",
    });
  }

  public override registerApplicationCommands(
    registry: ChatInputCommand.Registry
  ) {
    registry.registerContextMenuCommand(
      (builder) =>
        builder //
          .setDMPermission(false)
          .setDefaultMemberPermissions("0")
          .setName("Grant Supporter")
          .setType(ApplicationCommandType.User),
      {
        idHints: ["1116144978213736469"],
      }
    );
  }

  public override async contextMenuRun(
    interaction: Command.ContextMenuCommandInteraction
  ) {
    if (!interaction.isUserContextMenuCommand()) return; // to typeguard

    const member = interaction.targetMember;

    if (!isGuildMember(member)) {
      throw new Error("No member found.");
    }

    const playerData = await prisma.minecraftPlayer.findFirst({
      where: { discordId: member.id },
    });

    if (!playerData) {
      return interaction.reply({
        content: "This user does not have a linked Minecraft account.",
        ephemeral: true,
      });
    }

    await prisma.minecraftPlayer.update({
      where: { uuid: playerData.uuid },
      data: {
        supporterSince: new Date(),
      },
    });

    await prisma.queuedCommand.create({
      data: {
        command: `lp user ${playerData.uuid} parent addtemp supporter 1d replace`,
      },
    });

    interaction.reply({
      content: `Successfully granted <@${member.id}> the Supporter rank for 1 day.`,
      ephemeral: true,
    });

    const { data } = await axios.get(
      `https://sessionserver.mojang.com/session/minecraft/profile/${playerData.uuid}`
    );

    const username: string = data.name;

    const logEmbed = new EmbedBuilder()
      .setColor(colours.cyan)
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${member.id}> (\`${member.user.tag}\`)`,
          `${emojis.discover} **Minecraft**: [${username}](https://namemc.com/profile/${playerData.uuid}) (\`${playerData.uuid}\`)`,
          `${emojis.clock} **Expires**: <t:${Math.floor(
            (Date.now() + 86_400_000) /* 1 day */ / 1000
          )}:R>`,
          `${emojis.hammer} **Action**: Grant Supporter`,
        ].join("\n")
      )
      .setTimestamp();

    const logChannel = await interaction.client.channels.fetch(
      env.MEMBERSHIP_LOGS_CHANNEL_ID
    );

    if (!isTextChannel(logChannel)) {
      throw new Error(
        "Membership logs channel is not a text channel or is undefined/null."
      );
    }

    return logChannel.send({ embeds: [logEmbed] });
  }
}
