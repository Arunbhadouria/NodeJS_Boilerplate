import type { Queue } from "bullmq";

export const TASK_WELCOME = "email:welcome";

export interface WelcomeEmailPayload {
    to: string;
    firstName: string;
}

export async function enqueueWelcomeEmail(
    queue : Queue,
    payload : WelcomeEmailPayload
) : Promise<void> {
    await queue.add(TASK_WELCOME, payload, {
        attempts : 3,
        backoff : {
            type : "exponential",
            delay : 1000,
        },   
    })
}