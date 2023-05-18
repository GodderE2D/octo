// TODO: functionality for un-<ban, timeout, etc> logs

import { Case, CaseType, Member } from "@prisma/client";
import {
  ColorResolvable,
  CommandInteraction,
  GuildMember,
  MessageEmbed,
} from "discord.js";
import { channels, guidelines, logger } from "../index.js";
import colours from "../constants/colours.js";

const sendModLog = async (
  modCase: Case & {
    member: Member;
    moderator: Member | null;
  },
  interaction: CommandInteraction
) => {
  logger.debug(modCase);

  if (!channels) {
    throw new Error("Cannot find process channels.");
  }

  const modLogChannel = await interaction.guild?.channels.fetch(
    channels?.logging.channels.modLog
  );

  if (!modLogChannel?.isText()) {
    throw new Error(
      "Fetched channel is not a text channel or is undefined/null."
    );
  }

  const target = interaction.options.getMember("member", true);
  if (!(target instanceof GuildMember)) {
    throw new Error("Member is not a GuildMember.");
  }

  const moderator = interaction.member;
  if (!(moderator instanceof GuildMember)) {
    throw new Error("Moderator is not a GuildMember or is null.");
  }

  const colourMap: Record<CaseType, ColorResolvable> = {
    Warn: colours.blue,
    Timeout: colours.warning,
    Kick: colours.fuchsia,
    Softban: colours.fuchsia,
    Ban: colours.error,
    Restrict: colours.blue,
  };

  const embed = new MessageEmbed()
    .setColor(colourMap[modCase.type])
    .setAuthor({
      name: target.user.tag,
      iconURL: target.displayAvatarURL(),
      url: target.displayAvatarURL(),
    })
    .setFooter({
      text: `Case #${modCase.number}`,
    });

  const modLogDescArr = [];

  // Member
  if (target.nickname) {
    modLogDescArr.push(`**Member:** \`${target.user.tag}\` (\`${target.id}\`)`);
    modLogDescArr.push(`• Nickname: \`${target.nickname}\``);
  } else {
    modLogDescArr.push(`**Member:** \`${target.user.tag}\` (\`${target.id}\`)`);
  }
  modLogDescArr.push(
    `• Created <t:${Math.floor(
      target.user.createdTimestamp / 1000
    )}:R>, joined <t:${Math.floor(target.joinedTimestamp ?? 0 / 1000)}:R>`
  );

  // Moderator
  modLogDescArr.push(
    `**Moderator:** \`${moderator.user.tag}\` (\`${target.id}\`)`
  );

  // Action
  modLogDescArr.push(`**Action:** ${modCase.type}`);

  // Duration
  if (modCase.duration) {
    if (modCase.duration !== -1) {
      const expirationTimestamp =
        new Date(
          modCase.createdAt.getTime() / 1000 + modCase.duration
        ).getTime() / 1000;

      modLogDescArr.push(`**Expiration:** <t:${expirationTimestamp}:R>`);
    } else {
      modLogDescArr.push("**Expiration:** Never");
    }
  }

  // Reason
  modLogDescArr.push(`**Reason:** ${modCase.reason}`);

  // Rule violated
  if (modCase.ruleViolated) {
    const title = guidelines?.find(
      (g) => g.number === modCase.ruleViolated
    )?.title;
    modLogDescArr.push(
      `**Guideline violated:** #${modCase.ruleViolated}: ${title}`
    );
  }

  // Notes
  if (modCase.notes.length || modCase.attachmentNotes.length) {
    modLogDescArr.push("**Notes:**");

    if (modCase.notes.length) {
      // Format: [[`<authorTag>`](https://discord.com/users/<authorId> '<authorId>')] <note>
      const isURLRegex =
        /^(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?$/g;

      modLogDescArr.push(
        modCase.notes
          .map(
            (note) =>
              `• ${note.replace(isURLRegex, (url) => `[\`🔗 link\`](${url})`)}`
          )
          .join("\n")
      );
    }

    if (modCase.attachmentNotes.length) {
      const formattedStr = modCase.attachmentNotes
        .map((a, i) => `[\`🔗 ${i}\`](${a})`)
        .join(", ");
      const plural = modCase.attachmentNotes.length === 1 ? "" : "s";
      modLogDescArr.push(`• Attachment${plural}: ${formattedStr}`);
      embed.setImage(modCase.attachmentNotes[0]);
    }
  }

  // Appealable
  if (modCase.appealable) {
    modLogDescArr.push("**Appealable:** Yes");
  } else {
    modLogDescArr.push("**Appealable:** No");
  }

  // DM sent
  if (modCase.dmSent) {
    modLogDescArr.push("**DM sent:** Yes");
  } else {
    modLogDescArr.push("**DM sent:** No");
  }

  embed.setDescription(modLogDescArr.join("\n"));

  const modLogMsg = await modLogChannel.send({ embeds: [embed] });
  return modLogMsg;
  // TODO: add buttons for revert action, extend expiration, add note through modals, etc.
};

export default sendModLog;
