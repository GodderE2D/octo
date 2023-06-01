import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { ChatInputCommand, Command } from "@sapphire/framework";
import colours from "../../constants/colours.js";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "send-apply-message",
      description: "Sends the apply message to the current channel.",
    });
  }

  public override registerApplicationCommands(
    registry: ChatInputCommand.Registry
  ) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setDMPermission(false)
          .setDefaultMemberPermissions("0")
          .setName(this.name)
          .setDescription(this.description),
      {
        idHints: ["1112830480962826301"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    const embed = new EmbedBuilder()
      .setColor(colours.primary)
      .setTitle("Apply to Fortalice SMP")
      .setDescription(
        "Click on the button below to begin your application process. You will need to be able to join the Minecraft server during this process. Please set aside 3-5 minutes to complete the application."
      );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Apply")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("octo-fa-apply-button")
    );

    await interaction.channel?.send({
      embeds: [embed],
      components: [actionRow],
    });

    return interaction.reply({
      content: `Sent the apply message to ${interaction.channel}.`,
      ephemeral: true,
    });
  }
}
