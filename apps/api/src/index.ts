import { loadConfig } from "./config";
import { initLogger } from "./logger";
import { createServer, startServer, closeServer } from "./server";

const config = loadConfig();
const logger = initLogger(config.observability);

async function main() {
  const server = await createServer(config, logger);
  await startServer(server, config, logger);

  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down...");
    await closeServer(server, logger);
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down...");
    await closeServer(server, logger);
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start application");
  process.exit(1);
});