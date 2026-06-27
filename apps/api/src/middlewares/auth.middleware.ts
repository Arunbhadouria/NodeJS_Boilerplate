import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import "@fastify/jwt";
import { getLogger, requestContext } from "../logger";
import { newUnauthorizedError } from "../errors";
import { getRequestID } from "./request_id.middleware";

export interface JwtPayload {
    sub: string;
    role: string;
    iat: number;
    exp: number;
}

// extend FastifyRequest to include user info
declare module "@fastify/jwt" {
    interface FastifyJWT {

        payLoad: JwtPayload;

        user?: {
            id: string;
            role: string;
        };
    }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const logger = getLogger();
    const start = Date.now();

    try {
        // @fastify/jwt attaches .jwtVerify() to every request
        const payLoad = await request.jwtVerify<JwtPayload>();

        // attach user info to request — handlers access via request.user
        request.user = {
            id: payLoad.sub,
            role: payLoad.role,
        };

        const store = requestContext.getStore();
        if(store){
            store.userId = payLoad.sub;
            store.userRole = payLoad.role;
        }

        logger.info({
            function: "requireAuth",
            userID: payLoad.sub,
            requestId: getRequestID(request),
            duration: Date.now() - start,
        }, "Authentication succesful");
    } catch (err) {
        logger.error({
            function: "requireAuth",
            requestId: getRequestID(request),
            duration: Date.now() - start,
        }, "Authentication failed");

        const error = newUnauthorizedError("Unauthorized", false);
        reply.status(401).send(error.toJSON());
    }
}