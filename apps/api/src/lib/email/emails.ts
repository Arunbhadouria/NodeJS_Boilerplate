import type { EmailClient } from "./client";
import { TEMPLATES } from "./templates";

export const sendWelcomeEmail = async (emailClient: EmailClient, to: string, firstName: string) => {
    const subject = "Welcome to Boilerplate!";
    const data = {
        firstName,
    };
    const template = TEMPLATES.WELCOME;
    await emailClient.sendEmail(to, subject, template, data);
};
