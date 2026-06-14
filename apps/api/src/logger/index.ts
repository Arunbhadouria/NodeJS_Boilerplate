import pino, { type Logger } from "pino";
import { AsyncLocalStorage } from "node:async_hooks";
import {getLogLevel, type ObservabilityConfig } from "../config";

// --- AsyncLocalStorage for request-scoped trace context ---
// This lets us attach a traceId once per request, and every
// log call within that request automatically includes it.
type RequestContext = {
  traceID: string
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

let appLogger: Logger;

export function initLogger(cfg: ObservabilityConfig): Logger {
  const isProduction = cfg.environment === "production";

  appLogger = pino({
    level: getLogLevel(cfg),
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: cfg.serviceName,
      environment: cfg.environment,
    },
    // mixin runs on every log call - injects traceId if present
    mixin() {
      const ctx = requestContext.getStore();
      return ctx ? { traceID: ctx.traceID } : {};
    },
    transport: isProduction
      ? undefined
      : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
  });

  return appLogger;
}

export function getLogger(): Logger {
  if (!appLogger) {
    throw new Error("Logger not initialized - call initLogger() first");
  }
  return appLogger;
}

// ---Database logger---

export function createDatabaseLogger(cfg: ObservabilityConfig): Logger {
  const isProduction = cfg.environment === "production";

  return pino({
    level: cfg.logging.level,
    base: { component: "database" },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin() {
      const ctx = requestContext.getStore();
      return ctx ? { traceId: ctx.traceID } : {};
    },
    transport: isProduction
      ? undefined
      : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
  })
}

// ---Helpers---

export function truncateQuery(sql: string, maxLength: 200) {
  if (sql.length > maxLength) {
    return sql.slice(0, maxLength) + "...";
  }
  return sql;
}