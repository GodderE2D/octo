import { EmojiIdentifierResolvable } from "discord.js";

// Emojis listed here are uploaded to Blue Shark River.

export type Emojis = {
  success: EmojiIdentifierResolvable;
  error: EmojiIdentifierResolvable;
  neutral: EmojiIdentifierResolvable;
  warn: EmojiIdentifierResolvable;
  ban: EmojiIdentifierResolvable;
  kick: EmojiIdentifierResolvable;
  timeout: EmojiIdentifierResolvable;
  restrict: EmojiIdentifierResolvable;
  delete: EmojiIdentifierResolvable;
  staff: EmojiIdentifierResolvable;
  authorisation: EmojiIdentifierResolvable;
  octo: EmojiIdentifierResolvable;
  lemon: EmojiIdentifierResolvable;
};

const emojis: Emojis = {
  success: "<:_:1012176958777462794>",
  error: "<:_:1012176953060642937>",
  neutral: "<:_:1012176955380084796",
  warn: "<:_:1012176945598967838>",
  ban: "<:_:1012176947419304057>",
  kick: "<:_:1012176954109218917>",
  timeout: "<:_:1012176959855399032>",
  restrict: "<:_:1012176956281868320>",
  delete: "<:_:1012176948971192320>",
  staff: "<:_:1012176957846323230>",
  authorisation: "<:_:1012176946534305812>",
  octo: "<:_:1012179076540280832>",
  lemon: "<:_:1012179274591129643>",
};

export default emojis;
