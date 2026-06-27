import { randomUUID } from "node:crypto";
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { requestContext } from "../logger";

export const REQUEST_ID_HEADER = "x-request-id";

export type RequestContextData = {
    traceId: string;
    method: string;
    path: string;
    ip: string;
    userId?: string;
    userRole?: string;
};

export function requestMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
): void {
    const requestId = (request.headers[REQUEST_ID_HEADER] as string) ?? randomUUID();

    request.id = requestId;

    requestContext.run({
        traceID: requestId,
        method: request.method,
        path: request.url,
        ip: request.ip,
        },
        () => {
            reply.header(REQUEST_ID_HEADER, requestId);
            done();
        });
}

export function getRequestID(request: FastifyRequest): string {
    return request.id as string;
}