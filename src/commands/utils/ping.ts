import { ChatInputCommand, Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
import colours from "../../constants/colours.js";
import { env } from "../../index.js";

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
        guildIds: [env.guildId],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const checkingEmbed = new MessageEmbed()
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
      )
      .setFooter({
        text: "If Octo is slow at responding to other commands, the API might be slow.",
      });

    const sent = await interaction.reply({
      embeds: [checkingEmbed],
      fetchReply: true,
    });
    if (!(sent instanceof Message))
      throw new Error("Did not receive a Message.");

    const roundtripLatency =
      sent.createdTimestamp - interaction.createdTimestamp;

    const successEmbed = new MessageEmbed()
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
      )
      .setFooter({
        text: "If Octo is slow at responding to other commands, the API might be slow.",
      });

    return interaction.editReply({ embeds: [successEmbed] });
  }
}
