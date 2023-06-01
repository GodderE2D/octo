import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import colours from "../../constants/colours.js";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "ping",
      description:
        "Returns the latency of Octo, maybe it'll give you a lemon as well.",
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
        idHints: ["1109352099797549146"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    const checkingEmbed = new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({
        name: "When life gives you lemons...",
        iconURL: "https://i.imgur.com/IuCeaDE.png",
      })
      .setDescription(
        [
          `**Websocket heartbeat:** ${interaction.client.ws.ping}ms`,
          "**Roundtrip latency:** Checking...",
        ].join("\n")
      );

    const sent = await interaction.reply({
      embeds: [checkingEmbed],
      fetchReply: true,
    });

    const roundtripLatency =
      sent.createdTimestamp - interaction.createdTimestamp;

    const successEmbed = new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({
        name:
          Math.random() <= 0.5
            ? "Octo ran out of lemons..."
            : "A lemon for you!",
        iconURL: "https://i.imgur.com/IuCeaDE.png",
      })
      .setDescription(
        [
          `**Websocket heartbeat:** ${interaction.client.ws.ping}ms`,
          `**Roundtrip latency:** ${roundtripLatency}ms`,
        ].join("\n")
      );

    return interaction.editReply({ embeds: [successEmbed] });
  }
}
