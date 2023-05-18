import { ChatInputCommand, Command } from "@sapphire/framework";
import {
  GuildMember,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { env, guidelines, logger, prisma, roles } from "../../index.js";
import CommandError from "../../utils/commandError.js";
import { Roles } from "../../types/process.js";
import colours from "../../constants/colours.js";
import { createNewMemberData } from "../../utils/prisma.js";
import dayjs from "dayjs";
import emojis from "../../constants/emojis.js";
import parse from "parse-duration";
import sendModLog from "../../utils/sendModLog.js";

export class BanCommand extends Command {
  public requiredRoles: (keyof Roles)[] = ["mod", "overseer", "admin"];

  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "ban",
      description: "Bans a member from the server.",
      preconditions: ["RequiredRoles"],
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
          .addUserOption((option) =>
            option //
              .setName("member")
              .setDescription("The member to ban (mention or ID)")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option //
              .setName("reason")
              .setDescription("The reason for the ban")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option //
              .setName("duration")
              .setDescription(
                "How long the ban should last (e.g. 6h, 1d, 3d18h, never) (default: never)"
              )
              .setRequired(false)
          )
          .addStringOption((option) => {
            option.addChoices({
              name: "#0: Other Rule",
              value: "0",
            });

            if (guidelines) {
              option.addChoices(
                ...guidelines.map((g) => {
                  return {
                    name: `#${g.number}: ${g.title}`,
                    value: `${g.number}`,
                  };
                })
              );
            }

            return option //
              .setName("rule")
              .setDescription(
                "The server guideline that was violated (default: other)"
              )
              .setRequired(false);
          })
          .addBooleanOption((option) =>
            option //
              .setName("appealable")
              .setDescription(
                "Whether the ban is user-appealable or not (default: true)"
              )
              .setRequired(false)
          )
          .addStringOption((option) =>
            option //
              .setName("note")
              .setDescription(
                "A note visible to staff members only for the ban"
              )
              .setRequired(false)
          )
          .addAttachmentOption((option) =>
            option //
              .setName("attachment")
              .setDescription(
                "Media-based evidence(s) for the ban (e.g. screenshots)"
              )
              .setRequired(false)
          ),
      {
        guildIds: [env.guildId],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const target = interaction.options.getMember("member", true);
    if (!(target instanceof GuildMember)) {
      throw new CommandError({ message: "Target is not a GuildMember." });
    }

    const moderator = interaction.member;
    if (!(moderator instanceof GuildMember)) {
      throw new CommandError({
        message: "Moderator is not a GuildMember or is null.",
      });
    }

    // TODO: "UpcomingExpiryHandler" with djs collections and setTimeouts. fetch db on startup & every 30/15s.
    const reason = interaction.options.getString("reason", true);
    const duration =
      interaction.options.getString("duration", false) ?? "never";
    const rule = interaction.options.getString("rule") ?? "0"; // #0: Other Rule
    const appealable = interaction.options.getBoolean("appealable") ?? true;
    const note = interaction.options.getString("note");
    const attachment = interaction.options.getAttachment("attachment");

    if (!roles) {
      throw new CommandError({ message: "Cannot find process roles." });
    }

    const modRoles = [roles.mod, roles.overseer, roles.admin, roles.automation];

    if (target.roles.cache.hasAny(...modRoles)) {
      const protectedRoles = target.roles.cache
        .filter((r) => modRoles.includes(r.id))
        .map((r) => `${r.name}`);

      throw new CommandError({
        message: `You cannot ban ${target} because they have ${
          protectedRoles.length === 1 ? "a protected role" : "protected roles"
        }: ${protectedRoles.join(", ")}`,
        show: true,
      });
    }

    if (!target.bannable) {
      throw new CommandError({
        message: `Client does not have sufficient permissions to ban ${target}.`,
      });
    }

    // Calculate case number
    const largestIdCase = await prisma.case.findFirst({
      orderBy: {
        number: "desc",
      },
      select: {
        number: true,
      },
    });
    const caseNumber = (largestIdCase?.number ?? 0) + 1;

    // Parse expiration duration to seconds
    let parsedDuration: number | null;
    if (duration === "never") {
      parsedDuration = -1;
    } else {
      // parse-duration's parse() types may be wrong - it can also return null if the duration is unrecognised
      parsedDuration = Math.floor(parse(duration, "s"));

      if (
        !parsedDuration ||
        parsedDuration >= 60 /* 1 min */ ||
        parsedDuration <= 31536000 /* 1 year */
      ) {
        throw new CommandError({
          message: `The ban duration must be between 1 minute and 1 year (inclusive).`,
          show: true,
        });
      }
    }

    const ruleObj = guidelines?.find((g) => g.number === Number(rule));

    const dmEmbed = new MessageEmbed()
      .setColor(colours.error)
      .setAuthor({
        name: "Blue Shark River Moderation",
        iconURL: "https://i.imgur.com/dTjiNpz.png",
      })
      .setTitle("You have been banned from Blue Shark River.")
      // TODO improve embed description & other fields
      .setDescription("You have been banned from Blue Shark River.")
      .setFields(
        {
          name: "Reason",
          value: `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`, // converts first letter to uppercase
        },
        {
          name: "Guideline Violated",
          value:
            rule === "0"
              ? "Other/Unspecified"
              : `**#${rule}:** ${ruleObj?.title}\n>>> ${ruleObj?.description}`,
        },
        {
          name: "Moderator",
          value: `\`${moderator.user.tag}\` (\`${moderator.id}\`)`,
          inline: true,
        },
        {
          name: "Appealable",
          value: appealable
            ? `Yes: [Appeal](https://bsr.godder.xyz/appeal)`
            : "No",
          inline: true,
        },
        {
          name: "Expiration",
          value: `Expires <t:${dayjs
            .duration(parsedDuration, "s")
            .asSeconds()}:R>`,
          inline: true,
        }
      )
      .setFooter({
        text: `Case ${caseNumber}`,
      });

    let dmSent = false;
    try {
      await target.user.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch (err) {
      logger.warn(
        "Unable to send DM to user. This probably means the user does not accept DMs.\n",
        err
      );
    }

    await target.ban({
      days: 7,
      reason: `On behalf of ${interaction.user.tag} • ${reason
        .charAt(0)
        .toUpperCase()}${reason.slice(1)}`, // converts first letter to uppercase
    });

    // Format: [[`<authorTag>`](https://discord.com/users/<authorId> '<authorId>')] <note>
    const formattedNote = `[\`${interaction.user.tag}\`](https://discord.com/users/${interaction.user.id} '${interaction.user.id}'): ${note}`;

    const modCase = await prisma.case.create({
      data: {
        number: caseNumber,
        type: "Ban",
        member: {
          connectOrCreate: {
            where: {
              userId: target.id,
            },
            create: createNewMemberData(target),
          },
        },
        duration: parsedDuration,
        reason: `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`, // converts first letter to uppercase
        automod: false,
        notes: note ? [formattedNote] : [],
        attachmentNotes: attachment ? [attachment.proxyURL] : [],
        ruleViolated: Number(rule),
        appealable: appealable,
        dmSent,
        moderator: {
          connectOrCreate: {
            where: {
              userId: moderator.id,
            },
            create: createNewMemberData(moderator),
          },
        },
      },
      include: {
        member: true,
        moderator: true,
      },
    });

    const modLogMsg = await sendModLog(modCase, interaction);

    const embed = new MessageEmbed()
      .setColor(colours.success)
      .setDescription(
        `${emojis.success} **Banned** ${target} for \`${reason
          .charAt(0)
          .toUpperCase()}${reason.slice(1)}\`${
          parsedDuration === -1
            ? " indefinitely"
            : `, expires <t:${parsedDuration}:R>`
        } • \`${target.id}\``
      )
      .setFooter({
        text: `Case #${caseNumber}`,
      });

    const actionRow = new MessageActionRow().setComponents(
      new MessageButton() //
        .setStyle("LINK")
        .setURL(modLogMsg.url)
    );

    return interaction.reply({ embeds: [embed], components: [actionRow] });
  }
}
