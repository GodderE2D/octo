import { FastifyPluginCallback } from "fastify";

const Ping: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get("/api/ping", (req, res) => {
    return res.status(200).send("Pong!");
  });

  done();
};

export default Ping;
