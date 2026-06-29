import * as globalMiddleware from "./global.middleware";
import * as authMiddleware from "./auth.middleware";
import * as rateLimitMiddleware from "./rate_limit.middleware";
import * as requestIdMiddleware from "./request_id.middleware";

export interface Middlewares {
    Global: typeof globalMiddleware;
    Auth: typeof authMiddleware;
    RateLimit: typeof rateLimitMiddleware;
    RequestId: typeof requestIdMiddleware;
}

export function newMiddlewares(): Middlewares {
    return {
        Global: globalMiddleware,
        Auth: authMiddleware,
        RateLimit: rateLimitMiddleware,
        RequestId: requestIdMiddleware,
    };
}

// Re-export individual modules for convenience
export * from "./global.middleware";
export * from "./auth.middleware";
export * from "./rate_limit.middleware";
export * from "./request_id.middleware";
