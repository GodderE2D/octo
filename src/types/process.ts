import type { Snowflake } from "discord.js";

export type Channels = {
  visitorCentre: {
    id: Snowflake;
    channels: {
      welcome: Snowflake;
      guidelines: Snowflake;
      roles: Snowflake;
      announcements: Snowflake;
      monologue: Snowflake;
      memories: Snowflake;
    };
  };
  theSeashore: {
    id: Snowflake;
    channels: {
      general: Snowflake;
      submerged: Snowflake;
      deepSea: Snowflake;
      gaming: Snowflake;
      techNScience: Snowflake;
      creativity: Snowflake;
      threadIt: Snowflake;
      sunrise: Snowflake;
      voicelost: Snowflake;
      submarine: Snowflake;
      riverfest: Snowflake;
    };
  };
  theSanctuary: {
    id: Snowflake;
    channels: {
      sancResources: Snowflake;
      sancForAll: Snowflake;
      sancSensitive: Snowflake;
      sancJournals: Snowflake;
      sancRooms: Snowflake;
    };
  };
  theHighway: {
    id: Snowflake;
    channels: {
      botCommands: Snowflake;
      unbelievaboat: Snowflake;
      dankMemer: Snowflake;
      knotBot: Snowflake;
    };
  };
  outerSpace: {
    id: Snowflake;
    channels: {
      staffUpdates: Snowflake;
      internal: Snowflake;
      threadMsgs: Snowflake;
      admin: Snowflake;
      overseer: Snowflake;
      octochat: Snowflake;
      staffCmds: Snowflake;
    };
  };
  logging: {
    id: Snowflake;
    channels: {
      modLog: Snowflake;
    };
  };
};

export type Guidelines = {
  number: number;
  title: string;
  description: string;
}[];

export type Roles = {
  admin: Snowflake;
  automation: Snowflake;
  overseer: Snowflake;
  mod: Snowflake;
  contributor: Snowflake;
  angel: Snowflake;
  level75: Snowflake;
  level50: Snowflake;
  chillist: Snowflake;
  level25: Snowflake;
  level15: Snowflake;
  level10: Snowflake;
  level5: Snowflake;
  earlySupporter: Snowflake;
  rubRub: Snowflake;
  rubyReds: Snowflake;
  dodgerBlues: Snowflake;
  ssAccess: Snowflake;
  megaphoner: Snowflake;
};
