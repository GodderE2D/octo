import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { env, logger, prisma } from "../index.js";
import { Listener } from "@sapphire/framework";
import axios from "axios";
import colours from "../constants/colours.js";
import emojis from "../constants/emojis.js";
import { isTextChannel } from "@sapphire/discord.js-utilities";

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "interactionCreate",
    });
  }
  public async run(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "octo-fa-apply-button") return;

    const embed1 = new EmbedBuilder()
      .setColor(colours.primary)
      .setAuthor({ name: "Fortalice SMP Application" })
      .setDescription(
        "Welcome to Fortalice! Let's begin the application process."
      )
      .addFields(
        {
          name: "Joining the server",
          value:
            "To join the server, please ensure you are playing on Minecraft Java 1.19 or above. Then, go to Multiplayer and join a new server with the following IP address:\n**IP address**: `mc.bsr.gg`",
        },
        {
          name: "Verification",
          value:
            "Once you have joined the server, please press the button below to enter your Minecraft username.",
        }
      );
    // todo add image

    const actionRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Continue")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("octo-fa-apply-button-1")
    );

    const message = await interaction.reply({
      embeds: [embed1],
      components: [actionRow1],
      ephemeral: true,
      fetchReply: true,
    });

    const collector1 = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === "octo-fa-apply-button-1",
    });

    return collector1.on("collect", async (i) => {
      const modal = new ModalBuilder()
        .setTitle("Fortalice SMP Application")
        .setCustomId("octo-fa-apply-modal-1")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setLabel("Minecraft username")
              .setStyle(TextInputStyle.Short)
              .setMinLength(3)
              .setMaxLength(16)
              .setRequired(true)
              .setCustomId("octo-fa-username-input")
          )
        );

      i.showModal(modal);

      const modalInteraction = await i
        .awaitModalSubmit({ time: 900_000 })
        .catch(() => {
          i.followUp({
            content: "You did not respond in time.",
            ephemeral: true,
          });
        });

      if (!modalInteraction) return;

      const rawUsername = modalInteraction.fields.getTextInputValue(
        "octo-fa-username-input"
      );

      const { data } = await axios
        .get(`https://api.mojang.com/users/profiles/minecraft/${rawUsername}`)
        .catch(() => {
          modalInteraction.reply({
            content: "A player with that username does not exist.",
            ephemeral: true,
          });
          return { data: null };
        });

      if (!data) return;
      const { id: uuid, name: username }: { id: string; name: string } = data;

      const originalPlayer = await prisma.minecraftPlayer.findUnique({
        where: { uuid },
      });

      if (originalPlayer?.verified) {
        return void modalInteraction.reply({
          // todo
          content: "You have already verified your account.",
          ephemeral: true,
        });
      }

      // haha cryptography go brrrr
      const code = Math.floor(100000 + Math.random() * 900000);

      await prisma.minecraftPlayer.upsert({
        where: { uuid },
        create: {
          uuid,
          discord: {
            connectOrCreate: {
              where: { userId: interaction.user.id },
              create: { userId: interaction.user.id },
            },
          },
          verificationCode: code,
        },
        update: {
          verificationCode: code,
        },
      });

      const embed2 = new EmbedBuilder()
        .setColor(colours.primary)
        .setAuthor({ name: "Fortalice SMP Application" })
        .setDescription(
          `Let's verify your Minecraft account now. Type in \`/verify ${code}\` in-game then click the button below when you're done.\n\nAfter you verify your Minecraft account, you will be prompted to answer a few questions.`
        )
        .setFooter({
          iconURL: `https://crafatar.com/avatars/${uuid}`,
          text: `Verification for ${username}.\nNot you? Please restart the application process.`,
        });
      // todo add image

      const actionRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Continue")
          .setStyle(ButtonStyle.Primary)
          .setCustomId("octo-fa-apply-button-2")
      );

      const verifyPendingReply = await modalInteraction.reply({
        embeds: [embed2],
        components: [actionRow2],
        ephemeral: true,
        fetchReply: true,
      });

      const collector2 = verifyPendingReply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.customId === "octo-fa-apply-button-2",
      });

      return void collector2.on("collect", async (i) => {
        const playerData = await prisma.minecraftPlayer.findUnique({
          where: { uuid },
        });

        if (!playerData) throw new Error("Player data not found.");
        if (!playerData.verified) {
          return void i.reply({
            content:
              "You have not verified your account yet. If you need help, please contact a staff member.",
            ephemeral: true,
          });
        }

        await prisma.minecraftPlayer.update({
          where: { uuid },
          data: { verified: true },
        });

        const applicationModal = new ModalBuilder()
          .setTitle("Fortalice SMP Application")
          .setCustomId("octo-fa-apply-modal-2")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setLabel("Why do you want to join Fortalice SMP?")
                .setPlaceholder(
                  "How did you find out about Fortalice? Do you have any friends here? What do you want to do here?"
                )
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1024)
                .setRequired(true)
                .setCustomId("octo-fa-join-reason-input")
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setLabel("How often can you play on Fortalice SMP?")
                .setPlaceholder(
                  "How many hours per week can you play on average? Do you have any other commitments?"
                )
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(1024)
                .setRequired(true)
                .setCustomId("octo-fa-join-length-input")
            )
          );

        i.showModal(applicationModal);

        const appModalInteraction = await i
          .awaitModalSubmit({ time: 900_000 })
          .catch(() => {
            i.followUp({
              content: "You did not respond in time.",
              ephemeral: true,
            });
          });

        if (!appModalInteraction) return;

        const joinReason = appModalInteraction.fields.getTextInputValue(
          "octo-fa-join-reason-input"
        );
        const joinLength = appModalInteraction.fields.getTextInputValue(
          "octo-fa-join-length-input"
        );

        const reviewEmbed = new EmbedBuilder()
          .setColor(colours.primary)
          .setAuthor({ name: "Fortalice SMP Application" })
          .setDescription(
            "Please review your application below before submitting it. Your application will be reviewed by our staff members within 24 hours.\n\nBy submitting an application, you agree to follow the gameplay rules which can be found in https://discord.com/channels/983301648829001768/1112845678377455616."
          )
          .addFields(
            {
              name: "Minecraft username",
              value: username,
              inline: true,
            },
            {
              name: "Discord username",
              value: interaction.user.tag,
              inline: true,
            },
            {
              name: "Why do you want to join Fortalice SMP?",
              value: joinReason,
            },
            {
              name: "How often can you play on Fortalice SMP?",
              value: joinLength,
            }
          );

        const actionRow3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Submit")
            .setStyle(ButtonStyle.Primary)
            .setCustomId("octo-fa-apply-button-3")
        );

        const reviewReply = await appModalInteraction.reply({
          embeds: [reviewEmbed],
          components: [actionRow3],
          ephemeral: true,
          fetchReply: true,
        });

        const collector3 = reviewReply.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter: (i) => i.customId === "octo-fa-apply-button-3",
        });

        return void collector3.on("collect", async (i) => {
          const appsChannel = await i.client.channels.fetch(
            env.APPLICATIONS_CHANNEL_ID
          );

          if (!isTextChannel(appsChannel)) {
            throw new Error(
              "Applications channel is not a text channel or doesn't exist."
            );
          }

          const thread = await appsChannel.threads.create({
            name: `${username} - ${i.user.tag}`,
            type: ChannelType.PrivateThread,
            invitable: false,
          });

          await thread.members.add(
            i.user,
            "Added applicant to application thread."
          );

          const applicationEmbed = new EmbedBuilder()
            .setColor(colours.primary)
            .setAuthor({ name: "New application" })
            .setDescription(
              `A new application has been submitted by ${i.user}.`
            )
            .addFields(
              {
                name: "Minecraft",
                value: `[${username}](https://namemc.com/profile/${uuid})\n\`${uuid}\``,
              },
              {
                name: "Why do you want to join Fortalice SMP?",
                value: joinReason,
              },
              {
                name: "How often can you play on Fortalice SMP?",
                value: joinLength,
              }
            );

          thread.send({
            embeds: [applicationEmbed],
            content: `<@${i.user.id}> <@&983306542088601620>`,
          });

          i.reply({
            content: `Your application has been submitted. Check <#${thread.id}>.`,
            ephemeral: true,
          });

          await prisma.minecraftPlayer.update({
            where: { uuid },
            data: { applicationChannelId: thread.id },
          });

          const logEmbed = new EmbedBuilder()
            .setColor(colours.blue)
            .setAuthor({
              name: `${i.user.tag} (${i.user.id})`,
              iconURL: i.user.displayAvatarURL({ forceStatic: true }),
            })
            .setDescription(
              [
                `${emojis.person} **Member**: <@${i.user.id}> (\`${i.user.tag}\`)`,
                `${emojis.discover} **Minecraft**: [${username}](https://namemc.com/profile/${uuid}) (\`${uuid}\`)`,
                `${emojis.hammer} **Action**: Application Submit`,
                `${emojis.channel} **Application Channel**: <#${thread.id}>`,
              ].join("\n")
            )
            .setTimestamp();

          const logChannel = await i.client.channels.fetch(
            env.MEMBERSHIP_LOGS_CHANNEL_ID
          );

          if (!isTextChannel(logChannel)) {
            throw new Error(
              "Membership logs channel is not a text channel or is undefined/null."
            );
          }

          return void logChannel.send({ embeds: [logEmbed] });
        });
      });
    });
  }
}
