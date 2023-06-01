import { ChatInputCommand, Command } from "@sapphire/framework";
import { env, prisma } from "../../index.js";
import { isTextChannel, isThreadChannel } from "@sapphire/discord.js-utilities";
import { EmbedBuilder } from "discord.js";
import axios from "axios";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "member",
      description: "Manage a user's Fortalice membership status.",
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
          .setDescription(this.description)
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("The user to manage the membership for.")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("status")
              .setDescription("Whether to give or revoke membership.")
              .addChoices(
                {
                  name: "Give",
                  value: "give",
                },
                {
                  name: "Revoke",
                  value: "revoke",
                }
              )
              .setRequired(true)
          ),
      {
        idHints: ["1112858835649036288"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    const user = interaction.options.getUser("user", true);
    const status = interaction.options.getString("status", true) as
      | "give"
      | "revoke";

    const playerData = await prisma.minecraftPlayer.findFirst({
      where: { discordId: user.id },
    });

    if (!playerData) {
      return interaction.reply({
        content: "This user does not have a linked Minecraft account.",
        ephemeral: true,
      });
    }

    await prisma.minecraftPlayer.update({
      where: { uuid: playerData.uuid },
      data: {
        member: status === "give",
        applicationChannelId: null,
      },
    });

    await prisma.queuedCommand.create({
      data: {
        command: `lp user ${playerData.uuid} parent ${
          status === "give" ? "add" : "remove"
        } member`,
      },
    });

    interaction.reply({
      content: `Successfully ${status === "give" ? "given" : "revoked"} <@${
        user.id
      }>'s Fortalice membership.`,
      ephemeral: true,
    });

    if (!playerData.applicationChannelId) return;

    const channel = await interaction.guild?.channels.fetch(
      playerData.applicationChannelId
    );

    if (!isThreadChannel(channel)) {
      throw new Error("Application channel is not a thread channel.");
    }

    const notificationEmbed = new EmbedBuilder()
      .setColor(status === "give" ? colours.success : colours.error)
      .setAuthor({
        name: `Application ${status === "give" ? "accepted" : "rejected"}`,
      })
      .setDescription(
        `Your application has been ${
          status === "give" ? "accepted" : "rejected"
        }. ${
          status === "give"
            ? "Welcome to Fortalice!"
            : "We hope you find another server that suits you!"
        }\nHow did we do? Let us know in <#1109758696319365160>!`
      )
      .setFooter({ text: "Thank you for your interest in Fortalice SMP!" });

    await channel.send({
      content: `<@${user.id}>`,
      embeds: [notificationEmbed],
    });

    await channel.setArchived(true);

    const { data } = await axios.get(
      `https://sessionserver.mojang.com/session/minecraft/profile/${playerData.uuid}`
    );

    const username: string = data.name;

    const logEmbed = new EmbedBuilder()
      .setColor(status === "give" ? colours.success : colours.error)
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: <@${user.id}> (\`${user.tag}\`)`,
          `${emojis.discover} **Minecraft**: [${username}](https://namemc.com/profile/${playerData.uuid}) (\`${playerData.uuid}\`)`,
          `${emojis.hammer} **Action**: Membership ${
            status === "give" ? "Give" : "Revoke"
          }`,
          `${emojis.channel} **Application Channel**: <#${playerData.applicationChannelId}>`,
        ].join("\n")
      )
      .setTimestamp();

    const logChannel = await interaction.client.channels.fetch(
      env.MEMBERSHIP_LOGS_CHANNEL_ID
    );

    if (!isTextChannel(logChannel)) {
      throw new Error(
        "Membership logs channel is not a text channel or is undefined/null."
      );
    }

    return logChannel.send({ embeds: [logEmbed] });
  }
}
