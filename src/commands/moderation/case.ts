import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  embedLength,
} from "discord.js";
import { ChatInputCommand, Command } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import dayjs from "dayjs";
import emojis from "../../constants/emojis.js";
import { prisma } from "../../index.js";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "case",
      description: "Lists or manages cases for a user.",
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
          .addIntegerOption((option) =>
            option.setName("number").setDescription("The case number to manage")
          )
          .addUserOption((option) =>
            option.setName("user").setDescription("The user to list cases for")
          )
          .addStringOption((option) =>
            option
              .setName("type")
              .setDescription("The type of case to list")
              .addChoices(
                { name: "Warn", value: "Warn" },
                { name: "Timeout", value: "Timeout" },
                { name: "Timeout End", value: "TimeoutEnd" },
                { name: "Kick", value: "Kick" },
                { name: "Softban", value: "Softban" },
                { name: "Ban", value: "Ban" },
                { name: "Unban", value: "Unban" }
              )
          ),
      {
        idHints: ["1113623833954500628"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    const number = interaction.options.getInteger("number");
    const targetUser = interaction.options.getUser("user");
    const type = interaction.options.getString("type") as
      | "Warn"
      | "Timeout"
      | "TimeoutEnd"
      | "Kick"
      | "Softban"
      | "Ban"
      | "Unban"
      | null;

    if (targetUser) {
      const user = await prisma.member.findUnique({
        where: {
          userId: targetUser.id,
        },
      });

      if (!user) {
        return interaction.reply({
          content: `${emojis.error} The target user was not found in the database.`,
          ephemeral: true,
        });
      }
    }

    const originalCases = await prisma.case.findMany({
      where: {
        number: number ?? undefined,
        memberId: targetUser?.id ?? undefined,
        type: type ?? undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!originalCases.length) {
      return interaction.reply({
        content: `${emojis.error} No cases were found with your specified filters.`,
        ephemeral: true,
      });
    }

    let cases = originalCases;
    let currentPage = 1;
    const embeds: EmbedBuilder[] = [];

    while (cases.length) {
      const embed = new EmbedBuilder()
        .setTitle(`${originalCases.length} total case(s) found`)
        .setDescription(
          [
            `The following filters were applied with your search:`,
            number && `• **Case number:** ${number}`,
            targetUser && `• **User:** ${targetUser}`,
            type && `• **Type:** ${type}`,
          ]
            .filter(Boolean)
            .join("\n")
        )
        .setColor(colours.primary);

      if (targetUser) {
        embed.setAuthor({
          name: `${targetUser.tag} (${targetUser.id})`,
          iconURL: targetUser.displayAvatarURL({ forceStatic: true }),
        });
      }

      for (const c of cases) {
        const field = {
          name: `<t:${Math.floor(c.createdAt.getTime() / 1000)}:R> • #${
            c.number
          } • ${c.type}${c.processed === false ? " (Active)" : ""}`,
          value: [
            `• **User:** <@${c.memberId}> (\`${c.memberId}\`)`,
            `• **Moderator:** <@${c.moderatorId}>`,
            `• **Reason:** ${c.reason}`,
            c.duration &&
              `• **Duration:** ${
                c.duration !== -1
                  ? dayjs.duration({ milliseconds: c.duration }).humanize()
                  : "Permanent"
              }`,
            c.referenceNumber && `• **Reference:** #${c.referenceNumber}`,
            c.logMessageLink && `• **Log Message:** ${c.logMessageLink}`,
          ]
            .filter(Boolean)
            .join("\n"),
        };

        const totalLength =
          embedLength(embed.data) + field.name.length + field.value.length;

        // 10 fields max
        // 20 characters buffer for footer
        // embed's total max value is 6000 characters
        if ((embed.data.fields?.length ?? 0) <= 10 && totalLength <= 5980) {
          embed.addFields(field);
          cases = cases.filter((filterCase) => filterCase.number !== c.number);
        } else {
          break;
        }
      }

      embed.setFooter({ text: `Page ${currentPage}` });
      embeds.push(embed);
      currentPage++;
    }

    for (const embed of embeds) {
      embed.setFooter({ text: `${embed.data.footer?.text}/${embeds.length}` });
    }

    let paginationPage = 1;

    const buttonActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`octo-case-previous:${interaction.id}`)
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(paginationPage === 1),
      new ButtonBuilder()
        .setCustomId(`octo-case-next:${interaction.id}`)
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(paginationPage === embeds.length)
    );

    const reply = await interaction.reply({
      embeds: [embeds[0].data],
      components: [buttonActionRow],
      ephemeral: true,
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      filter: (i) =>
        [
          `octo-case-previous:${interaction.id}`,
          `octo-case-next:${interaction.id}`,
        ].includes(i.customId),
      time: 900_000,
    });

    collector.on("collect", (i) => {
      if (i.customId === `octo-case-previous:${interaction.id}`) {
        paginationPage--;
      } else {
        paginationPage++;
      }

      const buttonActionRow =
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`octo-case-previous:${interaction.id}`)
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(paginationPage === 1),
          new ButtonBuilder()
            .setCustomId(`octo-case-next:${interaction.id}`)
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(paginationPage === embeds.length)
        );

      i.deferUpdate();
      interaction.editReply({
        embeds: [embeds[paginationPage - 1]],
        components: [buttonActionRow],
      });
    });

    collector.on("end", () => {
      interaction.editReply({
        embeds: reply.embeds,
        components: [],
      });
    });

    return;
  }
}
