import "dotenv/config";
import { z } from "zod";

const PrimarySchema = z.object({
    env: z.enum(["development", "staging", "production"]).default("development"),
});

const ServerSchema = z.object({
    port: z.coerce.number().default(3000),
    readTimeout: z.coerce.number().default(30),
    writeTimeout: z.coerce.number().default(30),
    idleTimeout: z.coerce.number().default(60),
    corsAllowedOrigins: z.string().default("*").transform((s) => s.split(",")),
});

const DatabaseSchema = z.object({
    host: z.string().min(1),
    port: z.coerce.number().default(5432),
    user: z.string().min(1),
    password: z.string().optional().refine((val) => process.env.PRIMARY_ENV !== "production" || !!val, "Password is required in production"),
    name: z.string().min(1),
    sslMode: z.enum(["disable", "require", "verify-full"]).default("disable"),
    maxOpenConns: z.coerce.number().default(25),
    maxIdleConns: z.coerce.number().default(25),
    connMaxLifetime: z.coerce.number().default(300),
    connMaxIdleTime: z.coerce.number().default(300),
});

const RedisSchema = z.object({
    address: z.string().min(1)
});

const AuthSchema = z.object({
    secretKey: z.string().min(32, "Secret key must be at least 32 characters"),
});

const IntegrationSchema = z.object({
    resendApiKey: z.string().min(1),
});

const LoggingConfigSchema = z.object({
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
    format: z.enum(["json", "pretty"]).default("json"),
    slowQueryThreshold: z.coerce.number().min(0).default(100),
});

const HealthChecksConfigSchema = z.object({
    enabled: z.boolean().default(true),
    interval: z.coerce.number().min(1000).default(30000),
    timeout: z.coerce.number().min(1000).default(5000),
    checks: z.string().default("database,redis").transform((s) => s.split(",").map((c) => c.trim())),
});

const ObservabilitySchema = z.object({
    serviceName: z.string().min(1).default("boilerplate"),
    environment: z.enum(["development", "staging", "production"]).default("development"),
    logging: LoggingConfigSchema,
    healthChecks: HealthChecksConfigSchema,
});

const ConfigSchema = z.object({
    primary: PrimarySchema,
    server: ServerSchema,
    database: DatabaseSchema,
    redis: RedisSchema,
    auth: AuthSchema,
    integration: IntegrationSchema,
    observability: ObservabilitySchema,
});

export type Config = z.infer<typeof ConfigSchema>;
export type ObservabilityConfig = z.infer<typeof ObservabilitySchema>;

// --- Helper functions for observability ---

export function getLogLevel(config: ObservabilityConfig): string {
    switch (config.environment) {
        case "development":
            return "debug";
        case "production":
            return "info";
        default:
            return config.logging.level;
    }
}

export function isProduction(config: ObservabilityConfig): boolean {
    return config.environment === "production";
}

// --- Load config ---

export function loadConfig(): Config {
    try {
        return ConfigSchema.parse({
            primary: {
                env: process.env.PRIMARY_ENV,
            },
            server: {
                port: process.env.SERVER_PORT,
                readTimeout: process.env.SERVER_READ_TIMEOUT,
                writeTimeout: process.env.SERVER_WRITE_TIMEOUT,
                idleTimeout: process.env.SERVER_IDLE_TIMEOUT,
                corsAllowedOrigins: process.env.SERVER_CORS_ALLOWED_ORIGINS,
            },
            database: {
                host: process.env.DATABASE_HOST,
                port: process.env.DATABASE_PORT,
                user: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                name: process.env.DATABASE_NAME,
                sslMode: process.env.DATABASE_SSL_MODE,
                maxOpenConns: process.env.DATABASE_MAX_OPEN_CONNS,
                maxIdleConns: process.env.DATABASE_MAX_IDLE_CONNS,
                connMaxLifetime: process.env.DATABASE_CONN_MAX_LIFETIME,
                connMaxIdleTime: process.env.DATABASE_CONN_MAX_IDLE_TIME,
            },
            redis: {
                address: process.env.REDIS_ADDRESS,
            },
            auth: {
                secretKey: process.env.AUTH_SECRET_KEY,
            },
            integration: {
                resendApiKey: process.env.RESEND_API_KEY,
            },
            observability: {
                serviceName: process.env.OBSERVABILITY_SERVICE_NAME,
                environment: process.env.PRIMARY_ENV,
                logging: {
                    level: process.env.OBSERVABILITY_LOGGING_LEVEL,
                    format: process.env.OBSERVABILITY_LOGGING_FORMAT,
                    slowQueryThreshold: process.env.OBSERVABILITY_LOGGING_SLOW_QUERY_THRESHOLD,
                },
                healthChecks: {
                    enabled: process.env.OBSERVABILITY_HEALTH_CHECKS_ENABLED,
                    interval: process.env.OBSERVABILITY_HEALTH_CHECKS_INTERVAL,
                    timeout: process.env.OBSERVABILITY_HEALTH_CHECKS_TIMEOUT,
                    checks: process.env.OBSERVABILITY_HEALTH_CHECKS_CHECKS,
                },
            },
        });
    } catch (err) {
        console.error("Config validation failed - shutting down", err);
        process.exit(1);
    }
}