import { ChatInputCommand, Command } from "@sapphire/framework";
import { GuildMemberRoleManager, Message, MessageEmbed } from "discord.js";
import { channels, roles } from "../../index.js";
import { env, logger } from "../../index.js";
import { Roles } from "../../types/process.js";
import cmdCategories from "../../constants/cmdCategories.js";
import colours from "../../constants/colours.js";

export class HelpCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "help",
      description: "Need help? Get information on BSR and Octo commands.",
    });
  }

  public override registerApplicationCommands(
    registry: ChatInputCommand.Registry
  ) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description),
      {
        guildIds: [env.guildId],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const bsrEmbed = new MessageEmbed()
      .setColor(colours.sky)
      .setAuthor({
        name: "Blue Shark River",
        iconURL: "https://i.imgur.com/dTjiNpz.png",
      })
      .setDescription(
        [
          "Originally a Minecraft railway station, Blue Shark River fosters a community focusing on mental health for everyone. Chat with others at the Seashore, express your feelings in the Sanctuary, and find or create your fandom thread! We're happy to have you here.",
          `If you want to learn about the motivation, history, lore, and more about Blue Shark River, check out <#${channels?.visitorCentre.channels.welcome}>!`,
          "Most importantly: we want Blue Shark River to be a safe space for everyone. While BSR may not be your ideal place to escape from reality, our community-driven Sanctuary strives to help you find your true self and take care of your mental health.",
          `If you have any questions regarding Blue Shark River, don't hesitate to reach out to one of our staff members in <#${channels?.theSeashore.channels.general}> or DMs.`,
        ].join("\n\n")
      );

    const allCategories = this.container.stores
      .get("commands")
      .map((cmd) => cmd.fullCategory[0] ?? undefined);
    const categories = [...new Set(allCategories)];

    // Fetch application commands so it appears in cache
    await this.container.client.application?.commands.fetch();

    if (!(interaction.member?.roles instanceof GuildMemberRoleManager))
      throw new Error("Roles are not a GuildMemberRoleManager.");
    if (!roles) throw new Error("Process roles are not defined.");

    const userRolesArr = [...interaction.member.roles.cache.keys()];

    const octoEmbed = new MessageEmbed()
      .setColor(colours.primary)
      .setAuthor({
        name: "Octo",
        iconURL: "https://i.imgur.com/IuCeaDE.png",
      })
      .setDescription(
        [
          "Octo is a private multipurpose Discord bot made for Blue Shark River. Octo helps around the server to tidy things up and enforce guidelines. You can trust Octo as your new friend-bot. Oh, and how can I forget about lemons? 🍋",
          `However, Octo is open-source! If you're a developer, you can self-host Octo and use it in your own server. The source code and instructions are [available on GitHub](https://github.com/GodderE2D/octo).`,
        ].join("\n\n")
      )
      .addFields(
        categories.map((cat) => ({
          name: `${cmdCategories[cat] ?? cat} Commands`,
          value:
            this.container.stores
              .get("commands")
              .filter((cmd) => cmd.fullCategory[0] === cat)
              .filter((cmd) =>
                cmd.requiredRoles
                  ? cmd.requiredRoles.some((r) =>
                      userRolesArr.includes(roles?.[r] ?? "")
                    )
                  : true
              )
              .sort()
              .map(
                (cmd) =>
                  `</${cmd.name}:${
                    this.container.client.application?.commands.cache.find(
                      (c) => c.name === cmd.name
                    )?.id
                  }>・${cmd.description}`
              )
              .join("\n") || "null_commands",
        }))
      );

    octoEmbed.setFields(
      octoEmbed.fields.filter((field) => field.value !== "null_commands")
    );

    const sent = await interaction.reply({
      embeds: [bsrEmbed, octoEmbed],
      fetchReply: true,
    });
    if (!(sent instanceof Message))
      throw new Error("Did not receive a Message.");
  }
}
