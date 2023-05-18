import { GuildMember } from "discord.js";
import { Prisma } from "@prisma/client";

export const createNewMemberData = (
  member: GuildMember
): Prisma.XOR<
  Prisma.MemberCreateWithoutCasesInput,
  Prisma.MemberUncheckedCreateWithoutCasesInput
> => {
  return {
    userId: member.id,
  };
};
