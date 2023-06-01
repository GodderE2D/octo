import {
  AuditLogEvent,
  EmbedBuilder,
  GuildBasedChannel,
  VoiceState,
} from "discord.js";
import { Listener } from "@sapphire/framework";
import colours from "../../constants/colours.js";
import emojis from "../../constants/emojis.js";
import { env } from "../../index.js";

export class VoiceStateUpdateListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "voiceStateUpdate",
    });
  }

  public async fetchAuditLogs(state: VoiceState) {
    const moveLogs = await state.guild
      .fetchAuditLogs({
        type: AuditLogEvent.MemberMove,
        limit: 3,
      })
      .catch(() => undefined);

    const disconnectLogs = await state.guild
      .fetchAuditLogs({
        type: AuditLogEvent.MemberDisconnect,
        limit: 3,
      })
      .catch(() => undefined);

    const moveEntry = moveLogs?.entries.find(
      (entry) => Math.abs(entry.createdTimestamp - Date.now()) <= 2000
    );

    const disconnectEntry = disconnectLogs?.entries.find(
      (entry) => Math.abs(entry.createdTimestamp - Date.now()) <= 2000
    );

    const entry = moveEntry ?? disconnectEntry;

    if (!entry) return;
    let channel: GuildBasedChannel | undefined = undefined;
    if ("channel" in entry.extra) {
      channel =
        (await state.channel?.guild.channels
          .fetch(entry.extra.channel.id)
          .catch(() => undefined)) ?? undefined;
      if (entry.extra?.channel.id !== state.channelId) return;
    }
    if (!entry.executor) return;

    const timeDifference = Math.abs(entry.createdTimestamp - Date.now());
    if (timeDifference > 2000) return;

    return {
      entry,
      timeDifference,
      channel,
    };
  }

  private async fetchMuteOrDeaf(state: VoiceState) {
    const log = await state.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberUpdate,
      limit: 1,
    });

    if (!log) return;

    const entry = log.entries.find((entry) =>
      entry.changes.find((change) => ["mute", "deaf"].includes(change.key))
    );

    if (!entry) return;

    const timeDifference = Math.abs(entry.createdTimestamp - Date.now());
    if (timeDifference > 2000) return;

    return {
      entry,
      timeDifference,
      channel: undefined,
    };
  }

  public async run(oldState: VoiceState, newState: VoiceState) {
    const channelChanged = oldState.channelId !== newState.channelId;
    const muteChanged = oldState.serverMute !== newState.serverMute;
    const deafChanged = oldState.serverDeaf !== newState.serverDeaf;
    if (!channelChanged && !muteChanged && !deafChanged) return;

    const logChannel = await newState.guild.channels.fetch(
      env.VC_LOGS_CHANNEL_ID
    );

    const { entry, timeDifference, channel } = channelChanged
      ? (await this.fetchAuditLogs(newState)) ?? {}
      : (await this.fetchMuteOrDeaf(newState)) ?? {};

    const embed = new EmbedBuilder()
      .setAuthor({
        name: newState.member?.user.tag ?? "Unknown",
        iconURL: newState.member?.user.displayAvatarURL({ forceStatic: true }),
      })
      .setDescription(
        [
          `${emojis.person} **Member**: ${
            newState.member?.toString() ?? "Unknown"
          }${newState.member ? ` (\`${newState.member.id}\`)` : ""}`,
          `${emojis.minus} **Old Channel**: ${
            oldState.channel?.toString() ?? "N/A"
          }`,
          `${emojis.plus} **New Channel**: ${
            newState.channel?.toString() ?? "N/A"
          }`,
          muteChanged && entry?.executorId
            ? `${emojis.muted} **${
                newState.mute ? "Muted" : "Unmuted"
              } by**: <@${entry?.executorId}> (\`${entry?.executor?.tag}\`)`
            : undefined,
          deafChanged && entry?.executorId
            ? `${emojis.deafened} **${
                newState.deaf ? "Deafened" : "Undeafened"
              } by**: <@${entry?.executorId}> (\`${entry?.executor?.tag}\`)`
            : undefined,
          channel
            ? `${emojis.stageModerator} **Moved by**: <@${entry?.executorId}> (\`${entry?.executor?.tag}\`)`
            : undefined,
          channelChanged && !newState.channel && entry
            ? `${emojis.stageModerator} **Disconnected by**: <@${entry?.executorId}> (\`${entry?.executor?.tag}\`)`
            : undefined,
          entry
            ? `${emojis.clock} **Audit Log vs Event Difference**: ${timeDifference}ms`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setColor(
        channelChanged
          ? entry
            ? channel
              ? colours.warning
              : colours.error
            : newState.channel
            ? colours.green
            : colours.darkModeBg
          : muteChanged
          ? colours.pink
          : colours.violet
      )
      .setFooter({
        text: "Member Voice Channel Update",
      })
      .setTimestamp();

    if (!logChannel?.isTextBased()) {
      throw new Error("Channel is not text based or is undefined/null.");
    }

    return logChannel.send({ embeds: [embed] });
  }
}
