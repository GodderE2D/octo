import { Listener, SapphireClient } from "@sapphire/framework";
import { Message } from "discord.js";

const keys: Record<string, string> = {
  "what is grass": "define_grass",
  "what's grass": "define_grass",
  "whats grass": "define_grass",
};

const responses: Record<string, string> = {
  define_grass:
    "Poaceae or Gramineae is a large and nearly ubiquitous family of monocotyledonous flowering plants commonly known as grasses. It includes the cereal grasses, bamboos and the grasses of natural grassland and species cultivated in lawns and pasture. The latter are commonly referred to collectively as grass.",
};

export class ReadyListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: "messageCreate",
    });
  }
  public async run(message: Message) {
    for (const [key, value] of Object.entries(keys)) {
      if (message.content.toLowerCase() === key) {
        message.reply(responses[value]);
      }
    }
  }
}
