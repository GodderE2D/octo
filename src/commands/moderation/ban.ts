import { ChatInputCommand, Command } from "@sapphire/framework";
import { env, logger, prisma } from "../../index.js";
import { EmbedBuilder } from "discord.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import parse from "parse-duration";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "ban",
      description: "Bans a member from the server.",
      requiredUserPermissions: ["BanMembers"],
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
          .addUserOption((option) => option.setName("user").setDescription("The user to ban").setRequired(true))
          .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for the ban").setRequired(true)
          )
          .addStringOption((option) =>
            option.setName("duration").setDescription("The duration for the ban (e.g. 1d12h; default: 1y)")
          ),
      {
        idHints: ["1109370659093626881"],
      }
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const rawDuration = interaction.options.getString("duration");
    const duration = rawDuration ? (parse(rawDuration) as number | null) : Infinity;

    await interaction.deferReply({ ephemeral: true });

    if ((await interaction.guild?.bans.fetch())?.has(target.id)) {
      return interaction.editReply({
        content: `${emojis.error} The user is already banned.`,
      });
    }

    if (!duration) {
      return interaction.editReply({
        content: `${emojis.error} The duration provided is invalid.`,
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.editReply({
        content: `${emojis.error} You cannot ban yourself.`,
      });
    }

    if (target.id === interaction.client.id) {
      return interaction.editReply({
        content: `${emojis.error} You cannot ban lemons!`,
      });
    }

    const member = await interaction.guild?.members.fetch(target.id).catch(() => undefined);

    if (member && !member.bannable) {
      return interaction.editReply({
        content: `${emojis.error} I don't have permission to ban this user.`,
      });
    }

    let modCase = await prisma.case.create({
      data: {
        dmSent: false,
        reason,
        type: "Ban",
        processed: false,
        duration: duration === Infinity ? -1 : duration,
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
      .setTitle("You have been banned from Blue Shark River.")
      .setDescription(
        [
          `Our moderators have determined that you have violated our server rules. ${
            duration === Infinity
              ? "Unfortunately, this ban is permanent but can be appealed. See more information on appeals below."
              : "Please ensure to read our server rules if you wish to rejoin or appeal your ban."
          } You cannot join the server while this ban is active.`,
          "",
          `${emojis.channel} **Case Number**: #${modCase.number}`,
          `${emojis.clock} **Expires**: ${
            duration === Infinity
              ? "Permanent"
              : `<t:${Math.floor((Date.now() + duration) / 1000)}:F> (<t:${Math.floor(
                  (Date.now() + duration) / 1000
                )}:R>)`
          }`,
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
          value: `If you believe this ban was unjustified or otherwise wish to appeal your ban, please DM <@972742287291449365> with your Case Number #${modCase.number}. You can send a friend request if you are unable to DM, or email goddere2d@bsr.gg.`,
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
          "You have been banned from Blue Shark River.\nThis message contains an embed.\nInvite link: https://discord.gg/R2FDvcPXTK",
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

    await interaction.guild?.members.ban(target.id, {
      deleteMessageSeconds: 604_800, // 7 days
      reason: `Case #${modCase.number} • On behalf of ${interaction.user.tag} (${interaction.user.id}) • Duration: ${
        rawDuration ?? "Permanent"
      } • Reason: ${reason}`,
    });

    const responseEmbed = new EmbedBuilder()
      .setDescription(
        `${emojis.success} Banned <@${target.id}> (\`${target.id}\`) ${
          duration === Infinity ? "indefinitely" : `which expires <t:${Math.floor((Date.now() + duration) / 1000)}:R>`
        }.`
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
          `${emojis.person} **Member**: <@${target.id}> (\`${target.tag}\`)`,
          `${emojis.hammer} **Action**: Ban (${
            duration === Infinity ? "permanent" : `expires <t:${Math.floor((Date.now() + duration) / 1000)}:R>`
          })`,
          `${emojis.edit} **Reason**: ${reason}`,
        ].join("\n")
      )
      .setColor(colours.error)
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
