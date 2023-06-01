import { env, logger, prisma } from "../index.js";
import { FastifyPluginCallback } from "fastify";
import { z } from "zod";

const Verify: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.put("/api/verify", async (req, res) => {
    if (req.headers.authorization !== env.MC_API_KEY) {
      return res.status(401).send("UNAUTHORISED");
    }

    const schema = z.object({
      uuid: z.string(),
      code: z.number(),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).send(parsed.error.message);
    }

    const uuid = parsed.data.uuid.replaceAll("-", "");
    const code = parsed.data.code;

    logger.debug(uuid, code);

    const playerData = await prisma.minecraftPlayer.findUnique({
      where: { uuid },
    });

    if (!playerData) {
      return res.status(404).send("PLAYER_NOT_FOUND");
    }

    if (playerData.verified) {
      return res.status(200).send("ALREADY_VERIFIED");
    }

    if (playerData.verificationCode !== code) {
      return res.status(400).send("INVALID_CODE");
    }

    await prisma.minecraftPlayer.update({
      where: { uuid },
      data: { verified: true },
    });

    return res.status(200).send("VERIFIED");
  });

  done();
};

export default Verify;
