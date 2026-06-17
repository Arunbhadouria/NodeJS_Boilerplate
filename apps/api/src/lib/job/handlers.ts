import { Job, Worker, UnrecoverableError } from "bullmq";
import type { Logger } from "pino";
import type { Config } from "../../config";
import { TASK_WELCOME, type WelcomeEmailPayload } from "./email.tasks";
import { QUEUES } from "./index";
import { EmailClient } from "../email/client";
import { sendWelcomeEmail } from "../email/emails";

export function createEmailWorker(config: Config, logger: Logger): Worker {
    const connection = {
        host: config.redis.address.split(":")[0],
        port: Number(config.redis.address.split(":")[1]),
    };

    const worker = new Worker(
        QUEUES.DEFAULT,
        async (Job) => {
            const timeoutMs = 30000;

            const timeOutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Job timeout"))
                }, timeoutMs);
            });

            const emailClient = new EmailClient(config, logger);
            if (Job.name === TASK_WELCOME) {
                const payload = Job.data as WelcomeEmailPayload;
                logger.info({ type: "welcome", to: payload.to }, "Processing Welcome Email Task");

                try {
                    await Promise.race([
                        sendWelcomeEmail(emailClient, payload.to, payload.firstName),
                        timeOutPromise,
                    ]);
                    logger.info({ type: "welcome", to: payload.to }, "Successfully sent welcome email");
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    if (message === 'Job timed out') {
                        throw new UnrecoverableError('Job exceeded maximum allowed time');
                    }
                    logger.error({ err, type: "welcome", to: payload.to }, "Failed to send welcome email");
                    throw err;
                }
            }
        },
        {
            connection,
            concurrency: 10,
        }
    );

    worker.on("failed", (job, err) => {
        logger.error({ err, jobId: job?.id }, "Job failed after all retries");
    });

    return worker;
}