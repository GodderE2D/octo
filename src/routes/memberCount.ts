import { FastifyPluginCallback } from "fastify";
import { client } from "../index.js";

const Ping: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get("/api/memberCount", (req, res) => {
    const memberCount = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0
    );

    return res.status(200).send({
      discord: memberCount,
    });
  });

  done();
};

export default Ping;
