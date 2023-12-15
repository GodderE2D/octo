import { ChatInputCommand, Command } from "@sapphire/framework";
import { env, prisma } from "../../index.js";
import { EmbedBuilder } from "discord.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { isGuildMember } from "@sapphire/discord.js-utilities";
import parse from "parse-duration";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "timeout",
      description: "Timeouts a member from the server.",
      requiredUserPermissions: ["ModerateMembers"],
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
          .addUserOption((option) => option.setName("user").setDescription("The user to timeout").setRequired(true))
          .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for the timeout").setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("duration")
              .setDescription("The duration for the timeout (e.g. 1d12h; default: 2h; max: 28d)")
          ),
      {
        idHints: ["1109621125761208323"],
      }
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason", true);
    const rawDuration = interaction.options.getString("duration");
    const duration = rawDuration ? (parse(rawDuration) as number | null) : 7.2e6; // 2 hours

    await interaction.deferReply({ ephemeral: true });

    if (!isGuildMember(target)) {
      return interaction.editReply({
        content: `${emojis.error} The user to timeout must be in the server.`,
      });
    }

    if (!duration) {
      return interaction.editReply({
        content: `${emojis.error} The duration provided is invalid.`,
      });
    }

    if (duration > 2.419e9 /* 28 days */) {
      return interaction.editReply({
        content: `${emojis.error} The maximum duration is 28 days.`,
      });
    }

    if (target.isCommunicationDisabled()) {
      return interaction.editReply({
        content: `${emojis.error} The user is already timed out.`,
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.editReply({
        content: `${emojis.error} You cannot timeout yourself.`,
      });
    }

    if (target.id === interaction.client.id) {
      return interaction.editReply({
        content: `${emojis.error} You cannot timeout lemons!`,
      });
    }

    if (!target.moderatable) {
      return interaction.editReply({
        content: `${emojis.error} I don't have permission to timeout this user.`,
      });
    }

    let modCase = await prisma.case.create({
      data: {
        dmSent: false,
        reason,
        type: "Timeout",
        processed: false,
        duration,
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
      .setTitle("You have been timed out from Blue Shark River.")
      .setDescription(
        [
          `Our moderators have determined that you have violated our server rules. Please ensure to read our server rules when you decide to come back or when appealing your timeout. You cannot interact with the server while this timeout is active.`,
          "",
          `${emojis.channel} **Case Number**: #${modCase.number}`,
          `${emojis.clock} **Expires**: <t:${Math.floor((Date.now() + duration) / 1000)}:F> (<t:${Math.floor(
            (Date.now() + duration) / 1000
          )}:R>)`,
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
          value: `If you believe this timeout was unjustified or otherwise wish to appeal your timeout, please DM <@972742287291449365> with your Case Number #${modCase.number}. You can send a friend request if you are unable to DM, or email goddere2d@bsr.gg.`,
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
          "You have been timed out from Blue Shark River.\nThis message contains an embed.\nInvite link: https://discord.gg/R2FDvcPXTK",
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

    await target.timeout(
      duration,
      `Case #${modCase.number} • On behalf of ${interaction.user.tag} (${interaction.user.id}) • Duration: ${
        rawDuration ?? "2h"
      } • Reason: ${reason}`
    );

    const responseEmbed = new EmbedBuilder()
      .setDescription(
        `${emojis.success} Timed out <@${target.id}> (\`${target.id}\`) which expires <t:${Math.floor(
          (Date.now() + duration) / 1000
        )}:R>.`
      )
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
          `${emojis.hammer} **Action**: Timeout (expires <t:${Math.floor((Date.now() + duration) / 1000)}:R>)`,
          `${emojis.edit} **Reason**: ${reason}`,
        ].join("\n")
      )
      .setColor(colours.orange)
      .setFooter({
        text: `Case #${modCase.number} • ${modCase.dmSent ? "DM sent" : "DM not sent"}`,
      })
      .setTimestamp();

    const logChannel = await interaction.guild?.channels.fetch(env.MOD_LOGS_CHANNEL_ID);

    if (logChannel?.isTextBased()) {
      const logMessage = await logChannel.send({
        embeds: [logEmbed],
      });

      return await prisma.case.update({
        where: {
          number: modCase.number,
        },
        data: {
          logMessageLink: logMessage.url,
        },
      });
    } else {
      throw new Error("Channel is not text based or is undefined/null.");
    }
  }
}
