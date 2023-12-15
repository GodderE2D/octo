import { ChatInputCommand, Command } from "@sapphire/framework";
import { env, logger, prisma } from "../../index.js";
import { EmbedBuilder } from "discord.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { isGuildMember } from "@sapphire/discord.js-utilities";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "kick",
      description: "Kicks a member from the server.",
      requiredUserPermissions: ["KickMembers"],
    });
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDMPermission(false)
          .setDefaultMemberPermissions("0")
          .addUserOption((option) => option.setName("user").setDescription("The user to kick").setRequired(true))
          .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for the kick").setRequired(true)
          ),
      {
        idHints: ["1109912455339053106"],
      }
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason", true);

    await interaction.deferReply({ ephemeral: true });

    if (!isGuildMember(target)) {
      return interaction.editReply({
        content: `${emojis.error} The user to kick must be in the server.`,
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.editReply({
        content: `${emojis.error} You cannot kick yourself.`,
      });
    }

    if (target.id === interaction.client.id) {
      return interaction.editReply({
        content: `${emojis.error} You cannot kick lemons!`,
      });
    }

    const member = await interaction.guild?.members.fetch(target.id).catch(() => undefined);

    if (member && !member.kickable) {
      return interaction.editReply({
        content: `${emojis.error} I don't have permission to kick this user.`,
      });
    }

    let modCase = await prisma.case.create({
      data: {
        dmSent: false,
        reason,
        type: "Kick",
        member: {
          connectOrCreate: {
            where: {
              userId: target.id,
            },
            create: {
              userId: target.id,
            },
          },
        },
        moderator: {
          connectOrCreate: {
            where: {
              userId: interaction.user.id,
            },
            create: {
              userId: interaction.user.id,
            },
          },
        },
      },
    });

    const dmEmbed = new EmbedBuilder()
      .setAuthor({
        name: "Blue Shark River Moderation",
        iconURL: "https://i.imgur.com/20HqH6v.png",
      })
      .setTitle("You have been kicked from Blue Shark River.")
      .setDescription(
        [
          `Our moderators have determined that you have violated our server rules. Please ensure to read our server rules if you wish to rejoin or appeal your kick. You can immediately re-join the server.`,
          "",
          `${emojis.channel} **Case Number**: #${modCase.number}`,
          `${emojis.stageModerator} **Moderator**: <@${interaction.user.id}> (\`${interaction.user.tag}\`)`,
        ].join("\n")
      )
      .addFields(
        {
          name: `${emojis.edit} Reason`,
          value: reason,
        },
        {
          name: `${emojis.hammer} Appeal`,
          value: `If you believe this kick was unjustified or otherwise wish to appeal your kick, please DM <@972742287291449365> with your Case Number #${modCase.number}. You can send a friend request if you are unable to DM, or email goddere2d@bsr.gg.`,
        }
      )
      .setColor(colours.error)
      .setFooter({
        text: `This is an automated message.`,
      })
      .setTimestamp();

    const dmMessage = await target
      .send({
        content:
          "You have been kicked from Blue Shark River.\nThis message contains an embed.\nInvite link: https://discord.gg/R2FDvcPXTK",
        embeds: [dmEmbed],
      })
      .catch(() => undefined);

    if (dmMessage) {
      modCase = await prisma.case.update({
        where: {
          number: modCase.number,
        },
        data: {
          dmSent: true,
        },
      });
    }

    await interaction.guild?.members.kick(
      target.id,
      `Case #${modCase.number} • On behalf of ${interaction.user.tag} (${interaction.user.id}) • Reason: ${reason}`
    );

    const responseEmbed = new EmbedBuilder()
      .setDescription(`${emojis.success} Kicked <@${target.id}> (\`${target.id}\`).`)
      .setColor(colours.success)
      .setFooter({ text: `Case #${modCase.number}` });

    await interaction.editReply({
      embeds: [responseEmbed],
    });

    const logEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${target.id}> (\`${target.user.tag}\`)`,
          `${emojis.hammer} **Action**: Kick`,
          `${emojis.edit} **Reason**: ${reason}`,
        ].join("\n")
      )
      .setColor(colours.brown)
      .setFooter({
        text: `Case #${modCase.number} • ${modCase.dmSent ? "DM sent" : "DM not sent"}`,
      })
      .setTimestamp();

    const logChannel = await interaction.guild?.channels.fetch(env.MOD_LOGS_CHANNEL_ID);

    if (logChannel?.isTextBased()) {
      const logMessage = await logChannel.send({
        embeds: [logEmbed],
      });

      await prisma.case.update({
        where: {
          number: modCase.number,
        },
        data: {
          logMessageLink: logMessage.url,
        },
      });
    } else {
      return logger.warn(`Mod logs channel does not exist in this guild (${interaction.guildId}).`);
    }
  }
}
