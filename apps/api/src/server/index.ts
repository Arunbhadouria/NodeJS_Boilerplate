import fastify, { type FastifyInstance } from "fastify";
import Redis from "ioredis";
import type { Config } from "../config";
import type { Logger } from "pino";
import { createDatabase, connect as connectDb, close as closeDb, type Database } from "../db";
import { JobService } from "../lib/job";
import { requestMiddleware } from "../middlewares/request_id.middleware";
import { requireAuth } from "../middlewares/auth.middleware";

export interface AppServer {
  app: FastifyInstance;
  db: Database;
  redis: Redis;
  jobService: JobService;
}



export async function createServer(config: Config, logger: Logger): Promise<AppServer> {
  const db = createDatabase(config);
  await connectDb(db);
  const [redisHost, redisPort] = config.redis.address.split(":");
  const redis = new Redis({
    host: redisHost,
    port: Number(redisPort),
    lazyConnect: true, // don't connect immediately, we ping manually below
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) return null;
      // Exponential backoff
      return Math.min(times * 200, 2000);
    },
  });

  try {
    await redis.connect();
    await redis.ping();
    logger.info("Connected to redis");
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis, continuing without Redis"); //graceful degradation
  }

  const jobService = new JobService(config, logger);
  await jobService.start();

  const app = fastify({
    logger: false, // we use our own Pino instance, not Fastify's built-in
    requestTimeout: config.server.readTimeout * 1000,
  });

  app.addHook("onRequest", requestMiddleware);

  app.get("/health", async (request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });
  return { app, db, redis, jobService };
}

export async function startServer(server: AppServer, config: Config, logger: Logger) {
  try {
    await server.app.listen({ port: config.server.port, host: "0.0.0.0" });
    logger.info({ port: config.server.port, env: config.primary.env }, "Starting server");
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    throw err;
  }
}

export async function closeServer(server: AppServer, logger: Logger) {
  await server.app.close();
  await closeDb(server.db);
  await server.redis.quit();
  await server.jobService.stop();
  logger.info("Server shut down gracefully");
}