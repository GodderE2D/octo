import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder, User } from "discord.js";
import axios from "axios";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { prisma } from "../../index.js";

export class PingCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      name: "profile",
      description: "See a player's Minecraft profile.",
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
              .setName("discord")
              .setDescription("The Discord user to see the profile for.")
          )
          .addStringOption((option) =>
            option
              .setName("minecraft")
              .setDescription("The Minecraft username to see the profile for.")
          )
          .addStringOption((option) =>
            option
              .setName("uuid")
              .setDescription("The Minecraft uuid to see the profile for.")
          ),
      {
        idHints: ["1116144979774017577"],
      }
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    const discord = interaction.options.getUser("discord");
    const minecraft = interaction.options.getString("minecraft");
    const uuid = interaction.options.getString("uuid");

    await interaction.deferReply({ ephemeral: true });

    if (!discord && !minecraft && !uuid) {
      return await interaction.editReply({
        content: `${emojis.error} You must provide a Discord user, Minecraft username, or Minecraft uuid.`,
      });
    }

    const player = await this.getProfile(discord, minecraft, uuid);

    if (!player) {
      return await interaction.editReply({
        content: `${emojis.error} No linked player found.`,
      });
    }

    const { data } = await axios.get(
      `https://sessionserver.mojang.com/session/minecraft/profile/${player.uuid}`
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${data.name}`,
        iconURL: `https://crafatar.com/avatars/${player.uuid}`,
      })
      .setDescription(
        [
          `**UUID**: \`${player.uuid}\``,
          `**Discord**: <@${player.discordId}>`,
          `**Linked**: <t:${Math.floor(player.createdAt.getTime() / 1000)}:R>`,
          `**Main Account**: ${player.mainAccount ? "Yes" : "No"}`,
          `**Verified**: ${player.verified ? "Yes" : "No"}`,
          `**Supporter**: ${
            player.supporterSince
              ? `Since <t:${Math.floor(
                  player.supporterSince.getTime() / 1000
                )}:R>`
              : "No"
          }`,
        ].join("\n")
      )
      .setColor(colours.primary)
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  }

  private async getProfile(
    discord: User | null,
    minecraft: string | null,
    uuid: string | null
  ) {
    if (minecraft) {
      const { data } = await axios.get(
        `https://api.mojang.com/users/profiles/minecraft/${minecraft}`
      );

      if (!data) return;
      uuid = data.id;
    }

    const profile = await prisma.minecraftPlayer.findFirst({
      where: {
        discordId: discord?.id,
        uuid: uuid ?? undefined,
      },
    });

    return profile;
  }
}
