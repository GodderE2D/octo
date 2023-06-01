import { ChatInputCommand, Command } from "@sapphire/framework";
import { env, prisma } from "../../index.js";
import { EmbedBuilder } from "discord.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "unban",
      description: "Unbans a member from the server.",
      requiredUserPermissions: ["BanMembers"],
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
              .setDescription("The user to unban")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("reason")
              .setDescription("The reason for the unban")
              .setRequired(true)
          ),
      {
        idHints: ["1110018610149199943"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    await interaction.deferReply({ ephemeral: true });

    if (!(await interaction.guild?.bans.fetch())?.has(target.id)) {
      return interaction.editReply({
        content: `${emojis.error} The user is not banned.`,
      });
    }

    const modCase = await prisma.case.findFirst({
      where: {
        AND: {
          memberId: target.id,
          type: "Ban",
          processed: false,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    await interaction.guild?.bans.remove(
      target.id,
      `${
        modCase ? `Case #${modCase.number}` : "No case found"
      } • On behalf of ${interaction.user.tag} (${
        interaction.user.id
      }) • Reason: ${reason}`
    );

    const responseEmbed = new EmbedBuilder()
      .setDescription(
        `${emojis.success} Unbanned <@${target.id}> (\`${target.id}\`).`
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

    const unbanCase = await prisma.case.create({
      data: {
        reason,
        type: "Unban",
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

    const unbanEmbed = new EmbedBuilder()
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${
            target.id
          }> (${`\`${target.tag}\``})`,
          `${emojis.hammer} **Action**: Unban (${
            modCase
              ? `banned <t:${Math.floor(modCase.createdAt.getTime() / 1000)}:R>`
              : "no case found"
          })`,
          `${emojis.edit} **Reason**: ${unbanCase.reason}`,
          modCase?.logMessageLink
            ? `${emojis.link} **Case Reference**: [#${modCase.number}](${modCase.logMessageLink}) (Ban)`
            : "",
        ].join("\n")
      )
      .setColor(colours.darkModeBg)
      .setFooter({
        text: `Case #${unbanCase.number}`,
      })
      .setTimestamp();

    const logMessage = await logChannel.send({
      embeds: [unbanEmbed],
    });

    return await prisma.case.update({
      where: {
        number: unbanCase.number,
      },
      data: {
        logMessageLink: logMessage.url,
      },
    });
  }
}
