import postgres from "postgres";
import type { Config } from "../config";
import { createDatabaseLogger, truncateQuery } from "../logger";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(config: Config) {
    const dbLogger = createDatabaseLogger(config.observability);

    const sql = postgres({
        host: config.database.host,
        port: config.database.port,
        username: config.database.user,
        password: config.database.password,
        database: config.database.name,
        ssl: config.database.sslMode === "disable" ? false : config.database.sslMode,
        max: config.database.maxOpenConns,
        idle_timeout: config.database.connMaxIdleTime,
        max_lifetime: config.database.connMaxLifetime,

        debug: config.primary.env !== "production"
            ? (_connection, query) => dbLogger.debug({ query: truncateQuery(query, 200) }, "Query executed")
            : undefined,

        onnotice: (notice) => {
            dbLogger.warn({ notice }, "Database notice");
        },
    });

    return { sql, dbLogger };
}

// --- Ping database to verify connection (fail fast on startup) ---

export async function connect(db: Database): Promise<void> {
    const { sql, dbLogger } = db;
    try {
        await sql`SELECT 1`;
        dbLogger.info("Connected to the database");
    } catch (err) {
        dbLogger.error({ err }, "Failed to connect to the database");
        throw err;
    }

}

// --- Health check (used by /health endpoint later) ---

export async function healthCheck(db: Database): Promise<boolean> {
  try {
    await db.sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// --- Graceful shutdown ---

export async function close(db: Database): Promise<void> {
  db.dbLogger.info("Closing database connection pool");
  await db.sql.end();
}