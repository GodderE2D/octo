import { IntentsBitField } from "discord.js";

const intents = new IntentsBitField().add([
  IntentsBitField.Flags.Guilds,
  IntentsBitField.Flags.GuildMembers,
  IntentsBitField.Flags.GuildModeration,
  IntentsBitField.Flags.GuildMessages,
  IntentsBitField.Flags.GuildMessageReactions,
  IntentsBitField.Flags.GuildVoiceStates,
  IntentsBitField.Flags.AutoModerationExecution,
  IntentsBitField.Flags.AutoModerationConfiguration,
  IntentsBitField.Flags.DirectMessages,
  IntentsBitField.Flags.DirectMessageReactions,
  IntentsBitField.Flags.MessageContent,
]);

export default intents;
