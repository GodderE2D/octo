import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  GuildMember,
  GuildMemberRoleManager,
  Message,
} from "discord.js";
import { ChatInputCommandErrorPayload, Listener } from "@sapphire/framework";
import CommandError from "../utils/CommandError.js";
import colours from "../constants/colours.js";
import emojis from "../constants/emojis.js";
import { inspect } from "node:util";
import { logger } from "../index.js";

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
    let error: CommandError;
    if (!(rawError instanceof CommandError)) {
      if (!(rawError.cause instanceof Error)) rawError.cause = undefined;
      error = new CommandError({
        ...(rawError as Error & { cause: Error | undefined }),
      });
    } else {
      error = rawError;
    }

    // logger.debug("Error:", error);
    // logger.debug(`command: ${command}`);
    // logger.debug(`duration: ${duration}`);
    // logger.debug(`interaction: ${interaction}`);
    // logger.debug("error:", JSON.stringify(error, null, 2));
    // logger.debug("rawError:", JSON.stringify(rawError, null, 2));

    let reply: Message<boolean> | undefined;

    if (interaction.replied) {
      const fetchedReply = await interaction.fetchReply();
      reply = fetchedReply;
    }

    if (!(interaction.member instanceof GuildMember)) {
      throw new Error("Member is not a GuildMember.");
    }

    const logEmbed = new EmbedBuilder()
      .setColor(colours.error)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.member.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        rawError.toString().length > 4075 // 4096-21=4075, 21 is the length of text without rawError.toString()
          ? `\`\`\`js\n${rawError.toString().slice(0, 4075)}\`\`\`and more...`
          : `\`\`\`js\n${rawError.toString()}\`\`\``
      )
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
        }
      )
      .setFooter({ text: "Uncaught bot error" });

    const internalChannel = await interaction.guild?.channels.fetch(
      "1005478158692270080"
    );

    if (!internalChannel?.isTextBased()) {
      throw new Error(
        "Fetched channel is not a text channel or is undefined/null."
      );
    }

    await internalChannel.send({ embeds: [logEmbed] });

    const replyEmbed = new EmbedBuilder().setColor(colours.error).setFooter({
      text: "If you think this is in error, please contact a staff member.",
    });

    if (error.show) {
      replyEmbed.setDescription(`${emojis.error} ${error.message}`);
    } else {
      replyEmbed.setDescription(
        `${emojis.error} An unexpected error occurred; it probably wasn't your fault. Please try again later.`
      );
    }

    if (!interaction.replied) {
      interaction.reply({
        embeds: [replyEmbed],
        ephemeral: error.ephemeral,
      });
    } else {
      // Silently return if interaction is not ephemeral and error is ephemeral.
      if (error.ephemeral && !interaction.ephemeral) return;

      interaction.editReply({
        embeds: [replyEmbed],
      });
    }
  }
}
