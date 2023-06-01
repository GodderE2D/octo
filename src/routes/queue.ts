import { env, logger, prisma } from "../index.js";
import { FastifyPluginCallback } from "fastify";

const Verify: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get("/api/queue", async (req, res) => {
    if (req.headers.authorization !== env.MC_API_KEY) {
      return res.status(401).send("UNAUTHORISED");
    }

    const commands = await prisma.queuedCommand.findMany({
      where: { processed: false },
    });

    await prisma.queuedCommand.updateMany({
      where: { processed: false },
      data: { processed: true },
    });

    const text = commands.map((command) => command.command).join("\n");

    return res.status(200).send(text);
  });

  done();
};

export default Verify;
