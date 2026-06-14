import { loadConfig } from "./config";
import { initLogger } from "./logger";
import { createDatabase, connect, close } from "./db";

const config = loadConfig();
const logger = initLogger(config.observability);

const db = createDatabase(config);

async function main() {
  await connect(db);

  logger.info("Application starting...");
  logger.info({ env: config.primary.env }, "Configuration loaded");
}

main().catch((err) => {
  logger.error({ err }, "Failed to start application");
  process.exit(1);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  await close(db);
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down...");
  await close(db);
  process.exit(0);
});