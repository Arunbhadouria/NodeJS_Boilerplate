import type {
    FastifyInstance,
    FastifyRequest,
    FastifyReply,
    FastifyError,
} from "fastify";
import { getLogger } from "../logger";
import {
    isHttpError,
    newNotFoundError,
    newInternalServerError,
    makeUpperCaseWithUnderscores,
    type HttpError,
} from "../errors";
import { handleDbError } from "../sqlErr";


export function registerRequestLogger(app: FastifyInstance): void {
    app.addHook("onResponse", (request, reply, done) => {
        const logger = getLogger();
        const status = reply.statusCode;

        const logData = {
            method: request.method,
            url: request.url,
            status,
            latency: reply.elapsedTime,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            requestId: request.id,
        };

        if (status >= 500) {
            logger.error(logData, "API");
        } else if (status >= 400) {
            logger.warn(logData, "API");
        } else {
            logger.info(logData, "API");
        }

        done();
    });
}

// --- Global Error Handler ---
export function registerErrorHandler(app: FastifyInstance): void {
    app.setErrorHandler(
        (err: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
            const logger = getLogger();
            const originalErr = err;

            let processedErr: HttpError;

            if (isHttpError(err)) {
                // already our HttpError — pass through
                processedErr = err;
            } else {
                // try converting DB error → HttpError
                try {
                    handleDbError(err);
                    // handleDbError always throws, so this line never runs
                    processedErr = newInternalServerError();
                } catch (converted) {
                    if (isHttpError(converted)) {
                        processedErr = converted;
                    } else {
                        processedErr = newInternalServerError();
                    }
                }
            }

            // log original error with full context
            logger.error({
                err: originalErr,
                status: processedErr.status,
                errorCode: processedErr.code,
                method: request.method,
                url: request.url,
                requestId: request.id,
            }, processedErr.message);

            // send consistent JSON response
            reply.status(processedErr.status).send(processedErr.toJSON());
        }
    );

    // handle 404 — route not found
    app.setNotFoundHandler((request, reply) => {
        const err = newNotFoundError("Route not found", false);
        reply.status(404).send(err.toJSON());
    });
}