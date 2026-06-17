import { Queue, Worker, type Job } from "bullmq";
import type { Logger } from "pino";
import type { Config } from "../../config";

// Queue names with priorities
export const QUEUES = {
    CRITICAL: "critical",
    DEFAULT: "default",
    LOW: "low",
} as const;

export class JobService {
    private queues: Map<string, Queue> = new Map();
    private workers: Worker[] = [];
    private logger: Logger;

    constructor(private config: Config, logger: Logger) {
        this.logger = logger;

        const connection = {
            host: config.redis.address.split(':')[0],
            port: Number(config.redis.address.split(':')[1]),
        };

        for (const queue of Object.values(QUEUES)) {
            this.queues.set(queue, new Queue(queue, { connection }));
        }
    }

    getQueue(name: string): Queue {
        const queue = this.queues.get(name);
        if (!queue) throw new Error(`Queue ${name} not found`);
        return queue;
    }

    addWorker(worker: Worker): void {
        this.workers.push(worker);
    }

    async start(): Promise<void> {
        this.logger.info("Starting backgorund job worker");
    }

    async stop(): Promise<void> {
        this.logger.info("Stopping background job server");
        await Promise.all(this.workers.map((w) => w.close()));
        await Promise.all([...this.queues.values()].map((q) => q.close()));
    }
}