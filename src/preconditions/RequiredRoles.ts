// Syntax:
// Class: public requiredRoles: (keyof Roles)[] = ["mod"];
// Command options: preconditions: ["RequiredRoles"],

import {
  ApplicationCommandRegistries,
  Precondition,
} from "@sapphire/framework";
import {
  CommandInteraction,
  GuildMemberRoleManager,
  MessageEmbed,
} from "discord.js";
import colours from "../constants/colours.js";
import { roles } from "../index.js";

export class RequiredRolesPrecondition extends Precondition {
  public override async chatInputRun(interaction: CommandInteraction) {
    const registry = ApplicationCommandRegistries.acquire(
      interaction.commandName
    );

    if (!(interaction.member?.roles instanceof GuildMemberRoleManager))
      throw new Error("Roles are not a GuildMemberRoleManager.");
    if (!roles) throw new Error("Process roles are not defined.");

    const rolesArr = [...interaction.member.roles.cache.keys()];

    if (
      registry.command?.requiredRoles?.some((r) =>
        rolesArr.includes(roles?.[r] ?? "")
      )
    ) {
      return this.ok();
    } else {
      const embed = new MessageEmbed()
        .setColor(colours.error)
        .setAuthor({
          name: "An error occurred",
          iconURL: "https://i.imgur.com/zhyyTgU.png",
        })
        .setDescription(
          "You do not have sufficient permissions to use this command."
        )
        .setFooter({
          text: "If you think this is in error, please DM an Admin.",
        });

      interaction.reply({ embeds: [embed], ephemeral: true });

      return this.error({
        message: `User does not have sufficient permissions to use the command. At least one of the following roles are required: ${registry.command?.requiredRoles?.join(
          "\n"
        )}`,
      });
    }
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    RequiredRoles: never;
  }
}
