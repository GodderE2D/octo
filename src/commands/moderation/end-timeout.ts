import { ChatInputCommand, Command } from "@sapphire/framework";
import { env, prisma } from "../../index.js";
import { EmbedBuilder } from "discord.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { isGuildMember } from "@sapphire/discord.js-utilities";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "end-timeout",
      description: "Ends a member's timeout from the server.",
      requiredUserPermissions: ["ModerateMembers"],
    });
  }

  public override registerApplicationCommands(
    registry: ChatInputCommand.Registry
  ) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .setDMPermission(false)
          .setDefaultMemberPermissions("0")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("The user to end the timeout from")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("reason")
              .setDescription("The reason for the timeout end")
              .setRequired(true)
          ),
      {
        idHints: ["1110363394860662794"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason", true);

    await interaction.deferReply({ ephemeral: true });

    if (!isGuildMember(target)) {
      return interaction.editReply({
        content: `${emojis.error} The user to end the timeout must be in the server.`,
      });
    }

    if (!target.communicationDisabledUntilTimestamp) {
      return interaction.editReply({
        content: `${emojis.error} The user is not in timeout.`,
      });
    }

    const modCase = await prisma.case.findFirst({
      where: {
        AND: {
          memberId: target.id,
          type: "Timeout",
          processed: false,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    await target.timeout(
      null,
      `${
        modCase ? `Case #${modCase.number}` : "No case found"
      } • On behalf of ${interaction.user.tag} (${
        interaction.user.id
      }) • Reason: ${reason}`
    );

    const responseEmbed = new EmbedBuilder()
      .setDescription(
        `${emojis.success} Ended <@${target.id}>'s timeout (\`${target.id}\`).`
      )
      .setColor(colours.success)
      .setFooter({
        text: modCase ? `Case #${modCase.number}` : "No case found",
      });

    await interaction.editReply({
      embeds: [responseEmbed],
    });

    if (modCase) {
      await prisma.case.update({
        where: {
          number: modCase.number,
        },
        data: {
          processed: true,
        },
      });
    }

    const timeoutEndCase = await prisma.case.create({
      data: {
        reason,
        type: "TimeoutEnd",
        member: {
          connect: {
            userId: target.id,
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
        reference: modCase
          ? {
              connect: {
                number: modCase.number,
              },
            }
          : undefined,
      },
    });

    const logChannel = await interaction.client.channels.fetch(
      env.MOD_LOGS_CHANNEL_ID
    );
    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    const timeoutEndEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${
            target.id
          }> (${`\`${target.user.tag}\``})`,
          `${emojis.hammer} **Action**: Timeout End (${
            modCase
              ? `timed out <t:${Math.floor(
                  modCase.createdAt.getTime() / 1000
                )}:R>`
              : "no case found"
          })`,
          `${emojis.edit} **Reason**: ${timeoutEndCase.reason}`,
          modCase?.logMessageLink
            ? `${emojis.link} **Case Reference**: [#${modCase.number}](${modCase.logMessageLink}) (Ban)`
            : "",
        ].join("\n")
      )
      .setColor(colours.darkModeBg)
      .setFooter({
        text: `Case #${timeoutEndCase.number}`,
      })
      .setTimestamp();

    const logMessage = await logChannel.send({
      embeds: [timeoutEndEmbed],
    });

    return await prisma.case.update({
      where: {
        number: timeoutEndCase.number,
      },
      data: {
        logMessageLink: logMessage.url,
      },
    });
  }
}
