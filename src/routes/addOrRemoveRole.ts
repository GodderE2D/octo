import { client, env, logger, prisma } from "../index.js";
import { EmbedBuilder } from "discord.js";
import FARoles from "../constants/FARoles.js";
import { FastifyPluginCallback } from "fastify";
import colours from "../constants/colours.js";
import emojis from "../constants/emojis.js";
import { isTextBasedChannel } from "@sapphire/discord.js-utilities";
import { z } from "zod";

const AddOrRemoveRole: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.put("/api/addOrRemoveRole", async (req, res) => {
    if (req.headers.authorization !== env.MC_API_KEY) {
      return res.status(401).send("UNAUTHORISED");
    }

    const schema = z.object({
      uuid: z.string(),
      role: z.string(),
      add: z.boolean(),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).send(parsed.error.message);
    }

    const uuid = parsed.data.uuid.replaceAll("-", "");
    const { role, add } = parsed.data;

    const player = await prisma.minecraftPlayer.findUnique({
      where: { uuid },
    });

    if (!player) {
      return res.status(404).send("PLAYER_NOT_FOUND");
    }

    if (!player.discordId) {
      return res.status(400).send("PLAYER_NOT_LINKED");
    }

    const guild = await client.guilds.fetch(env.MAIN_GUILD_ID);
    if (!guild) {
      return res.status(500).send("GUILD_NOT_FOUND");
    }

    const member = await guild.members.fetch(player.discordId);
    if (!member) {
      return res.status(500).send("MEMBER_NOT_FOUND");
    }

    try {
      if (add) {
        await member.roles.add(FARoles[role]);
      } else {
        await member.roles.remove(FARoles[role]);
      }

      const logsChannel = await client.guilds.fetch(env.MAIN_GUILD_ID);

      if (logsChannel) {
        const logsChannel = await client.channels.fetch(
          env.MEMBERSHIP_LOGS_CHANNEL_ID
        );

        if (isTextBasedChannel(logsChannel)) {
          const embed = new EmbedBuilder()
            .setAuthor({
              name: `${member.user.tag} (${member.id})`,
              iconURL: member.user.displayAvatarURL({ forceStatic: true }),
            })
            .setDescription(
              [
                `${emojis.person} **Member**: <@${member.id}> (\`${member.user.tag}\`)`,
                `${emojis.edit} **Role**: <@&${FARoles[role]}> (\`${role}\`)`,
                `${emojis.hammer} **Action:** ${
                  add ? "Add" : "Remove"
                } FA Role`,
              ].join("\n")
            )
            .setColor(add ? colours.pink : colours.violet)
            .setTimestamp();

          await logsChannel
            .send({ embeds: [embed] })
            .catch((err) =>
              logger.error(
                "An error occurred while sending a message to the membership logs channel:",
                err
              )
            );
        }
      }
    } catch (error) {
      logger.error("An error occurred in /addOrRemoveRole:", error);
      return res.status(500).send("UNABLE_TO_ADD_OR_REMOVE_ROLE");
    }

    return res.status(200).send("ADDED_OR_REMOVED_ROLE");
  });

  done();
};

export default AddOrRemoveRole;
