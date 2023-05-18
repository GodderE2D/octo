import { ChatInputCommandErrorPayload, Listener } from "@sapphire/framework";
import {
  GuildMember,
  GuildMemberRoleManager,
  Message,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { channels, logger, roles } from "../index.js";
import CommandError from "../utils/commandError.js";
import colours from "../constants/colours.js";
import emojis from "../constants/emojis.js";
import { inspect } from "node:util";

export class ChatInputCommandErrorListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      once: false,
      event: "chatInputCommandError",
    });
  }
  public async run(
    rawError: Error,
    { command, duration, interaction }: ChatInputCommandErrorPayload
  ) {
    logger.debug(rawError);
    let error: CommandError;
    if (!(rawError instanceof CommandError)) {
      if (!(rawError.cause instanceof Error)) rawError.cause = undefined;
      error = new CommandError({
        ...(rawError as Error & { cause: Error | undefined }),
      });
    } else {
      error = rawError;
    }

    logger.debug("Error:", error);
    logger.debug(`command: ${command}`);
    logger.debug(`duration: ${duration}`);
    logger.debug(`interaction: ${interaction}`);
    logger.debug("error:", JSON.stringify(error, null, 2));
    logger.debug("rawError:", JSON.stringify(rawError, null, 2));

    if (!channels) {
      throw new Error("Cannot find process channels.");
    }

    let reply: Message<boolean> | undefined;

    if (interaction.replied) {
      const fetchedReply = await interaction.fetchReply();
      if (!(fetchedReply instanceof Message)) {
        throw new Error("Reply is not a Message.");
      }

      reply = fetchedReply;
    }

    const rawErrorWithTrace = inspect(error);

    if (!(interaction.member instanceof GuildMember)) {
      throw new Error("Member is not a GuildMember.");
    }

    const logEmbed = new MessageEmbed()
      .setColor(colours.error)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.member.displayAvatarURL(),
      })
      .setDescription(`${error.message}`)
      .addFields(
        {
          name: "Command",
          value: `\`${interaction}\``,
        },
        {
          name: "User",
          value: `${interaction.user} (\`${interaction.user.id}\`)`,
          inline: true,
        },
        {
          name: "Context",
          value: reply
            ? `[Message](${reply.url}) in ${interaction.channel}`
            : `${interaction.channel} (no/ephemeral reply)`,
          inline: true,
        },
        {
          name: "Raw Error",
          value:
            rawErrorWithTrace.length > 1004 // 1024-21=1004, 21 is the length of text without rawErrorWithTrace
              ? `\`\`\`js\n${rawErrorWithTrace.slice(0, 1004)}\`\`\`and more...`
              : `\`\`\`js\n${rawErrorWithTrace}\`\`\``,
        }
      );

    const internalChannel = await interaction.guild?.channels.fetch(
      channels.outerSpace.channels.internal
    );

    if (!internalChannel?.isText()) {
      throw new Error(
        "Fetched channel is not a text channel or is undefined/null."
      );
    }

    const logMessage = await internalChannel.send({ embeds: [logEmbed] });

    const replyEmbed = new MessageEmbed()
      .setColor(colours.error)
      .setAuthor({
        name: "An error occurred",
        iconURL: "https://i.imgur.com/zhyyTgU.png",
      })
      .setFooter({
        text: "If you think this is in error, please DM an Admin.",
      });

    if (error.show) {
      replyEmbed.setDescription(`${emojis.error} ${error.message}`);
    } else {
      replyEmbed.setDescription(
        `${emojis.error} An unexpected error occurred; it probably wasn't your fault. Please try again later.`
      );
    }

    const replyActionRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setStyle("LINK")
        .setLabel("View Log")
        .setURL(logMessage.url)
    );

    if (!(interaction.member?.roles instanceof GuildMemberRoleManager)) {
      throw new Error("Roles are not a GuildMemberRoleManager.");
    }

    if (!roles) {
      throw new Error("Cannot find process roles.");
    }

    if (!interaction.replied) {
      interaction.reply({
        embeds: [replyEmbed],
        components: interaction.member.roles.cache.has(roles.admin)
          ? [replyActionRow]
          : [],
        ephemeral: error.ephemeral,
      });
    } else {
      // Silently return if interaction is not ephemeral and error is ephemeral.
      if (error.ephemeral && !interaction.ephemeral) return;

      interaction.editReply({
        embeds: [replyEmbed],
        components: interaction.member.roles.cache.has(roles.admin)
          ? [replyActionRow]
          : [],
      });
    }
  }
}
