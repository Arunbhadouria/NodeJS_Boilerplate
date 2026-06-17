import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import type { Logger } from "pino";
import type { Config } from "../../config";
import { TEMPLATES, type Template } from "./templates";

export class EmailClient {
    private resend: Resend;
    private logger: Logger;
    private templatesDir: string;

    constructor(config: Config, logger: Logger) {
        this.resend = new Resend(config.integration.resendApiKey);
        this.logger = logger;
        this.templatesDir = path.join(process.cwd(), "templates", "emails");
    }

    async sendEmail(
        to: string,
        subject: string,
        templateName: Template,
        data: Record<string, string>
    ): Promise<void> {
        const templatePath = path.join(this.templatesDir, `${templateName}.html`);
        let templateSource: string;
        try {
            templateSource = await readFile(templatePath, "utf-8");
        } catch (err) {
            throw new Error(`Failed to read email template ${templateName}: ${err}`);
        }

        let html: string;
        try {
            const template = Handlebars.compile(templateSource);
            html = template(data);
        } catch (err) {
            throw new Error(`Failed to execute email template ${templateName}: ${err}`);
        }

        const { error } = await this.resend.emails.send({
            from: "Boilerplate <onboarding@resend.dev>",
            to: [to],
            subject,
            html,
        });

        if (error) {
            this.logger.error({ error, to, templateName }, "Failed to send email");
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}