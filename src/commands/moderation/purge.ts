import { ChatInputCommand, Command } from "@sapphire/framework";
import { Collection, EmbedBuilder, Message } from "discord.js";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";
import { isDMChannel } from "@sapphire/discord.js-utilities";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "purge",
      description: "Bulk deletes messages with specific filters.",
      requiredUserPermissions: ["ManageMessages"],
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
            option
              .setName("count")
              .setDescription("Limit of messages to delete (max: 100)")
          )
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("Only delete messages from this user")
          )
          .addRoleOption((option) =>
            option
              .setName("role")
              .setDescription("Only delete messages from users with this role")
          )
          .addStringOption((option) =>
            option
              .setName("regex")
              .setDescription(
                "Only delete messages that match this regular expression"
              )
          )
          .addStringOption((option) =>
            option
              .setName("after")
              .setDescription("Only delete messages after this message ID")
          ),
      {
        idHints: ["1109706013952712817"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true,
    });

    if (!interaction.guild || isDMChannel(interaction.channel)) {
      return await interaction.editReply({
        content: `${emojis.error} This command can only be used in a server.`,
      });
    }

    if (!interaction.channel?.isTextBased()) {
      return await interaction.editReply({
        content: `${emojis.error} This command can only be used in a text-based channel.`,
      });
    }

    const count = interaction.options.getInteger("count");
    const user = interaction.options.getUser("user");
    const role = interaction.options.getRole("role");
    const regex = interaction.options.getString("regex");
    const after = interaction.options.getString("after");

    if (count && (count < 1 || count > 100)) {
      return await interaction.editReply({
        content: `${emojis.error} The count filter must be between 1 and 100.`,
      });
    }

    let messages = (await interaction.channel?.messages.fetch({
      limit: count ?? 100,
      after: after ?? undefined,
    })) as Collection<string, Message<true>>;

    if (user) {
      messages = messages.filter((message) => message.author.id === user.id);
    }

    if (role) {
      messages = messages.filter((message) =>
        message.member?.roles.cache.has(role.id)
      );
    }

    if (regex) {
      messages = messages.filter((message) => message.content.match(regex));
    }

    if (messages.size === 0) {
      return await interaction.editReply({
        content: `${emojis.error} No messages that matched your filter were found.`,
      });
    }

    const { size } = await interaction.channel.bulkDelete(messages, true);

    if (!size) {
      return await interaction.editReply({
        content: `${emojis.error} No messages that matched your filter were found. (Are the messages older than 14 days?)`,
      });
    }

    const embed = new EmbedBuilder()
      .setDescription(`${emojis.success} Deleted \`${size}\` message(s).`)
      .setColor(colours.success);

    await interaction.editReply({
      embeds: [embed],
    });

    const logChannel = await interaction.guild.channels.fetch(
      env.MESSAGE_LOGS_CHANNEL_ID
    );

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    const logEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.hammer} **Action**: Purge`,
          `${emojis.channel} **Channel**: ${interaction.channel}`,
          `${emojis.search} **Messages**: ${size} message(s) deleted`,
          `${emojis.settings} **Filters**:`,
          count && `• Count: ${count}`,
          user && `• User: <@${user.id}>`,
          role && `• Role: <@&${role.id}>`,
          regex && `• Regex: \`${regex}\``,
          after &&
            `• After: \`${after}\` ([Jump to](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${after}))`,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setColor(colours.sky)
      .setTimestamp();

    return await logChannel.send({ embeds: [logEmbed] });
  }
}
