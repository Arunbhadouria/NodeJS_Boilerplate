import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { getLogger } from "../logger";

export async function registerRateLimit(app : FastifyInstance) : Promise<void> {
    await app.register(rateLimit,{
        max: 100, //max 100 req
        timeWindow: 60 * 1000, // per 1 min
        errorResponseBuilder: (request, context) => {
            const logger = getLogger();
            logger.warn({
                endpoint: request.url,
                method: request.method,
                ip: request.ip,
                requestId: request.id,
            }, "Rate Limit Hit");

            return {
                code: "TOO_MANY_REQUESTS",
                message: "You have exceeded the rate limit. Please try again later.",
                status: 429,
                override: false,
            };
        },
    });
}