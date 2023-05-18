import { client, env, prisma } from "../index.js";
import { Case } from "@prisma/client";
import { User } from "discord.js";

const fetchCases = async () => {
  return await prisma.case.findMany({
    where: {
      AND: [
        {
          processed: false,
        },
        {
          refuseToProcess: false,
        },
        {
          duration: {
            not: -1,
          },
        },
        {
          type: { in: ["Warn", "Ban", "Timeout", "Restrict"] },
        },
      ],
    },
  });
};

const handleCase = async (modCase: Case) => {
  switch (modCase.type) {
    case "Warn": {
      break;
    }

    case "Ban": {
      if (!modCase.duration) return;
      const expiresAt = modCase.createdAt.getTime() / 1000 + modCase.duration;

      if (expiresAt >= Date.now() / 1000) {
        const guild = client.guilds.resolve(env.guildId);
        if (!guild) throw new Error("Main guild not found.");
        if (!guild.available) return;

        let user: User;
        try {
          user = await client.users.fetch(modCase.memberId);
          if (!user) throw new Error("User not found.");
        } catch (error) {
          return await prisma.case.update({
            where: {
              id: modCase.id,
            },
            data: {
              refuseToProcess: modCase.processAttempts >= 2,
              processAttempts: modCase.processAttempts + 1,
            },
          });
        }

        await guild.bans.remove(user, `Case #${modCase.number} • Ban expired`);
      }
      break;
    }

    case "Timeout": {
      break;
    }

    case "Restrict": {
      break;
    }
  }

  // TODO: remove when finished
  return null;
};

const upcomingExpiryHandler = async () => {
  // TODO: change to let, it was changed to const to comply with TS errors when still WIP
  const currentCases: Case[] = await fetchCases();
};

export default upcomingExpiryHandler;
