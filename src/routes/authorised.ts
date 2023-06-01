import { FastifyPluginCallback } from "fastify";
import { env } from "../index.js";

const Ping: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get("/api/authorised", (req, res) => {
    if (req.headers.authorization !== env.MC_API_KEY) {
      return res.status(401).send("You are not authorised!");
    }

    return res.status(200).send("You are authorised!");
  });

  done();
};

export default Ping;
