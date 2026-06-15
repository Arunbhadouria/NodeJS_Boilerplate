export interface FieldError {
    field: string;
    error: string;
}

export type ActionType = "redirect";

export interface Action {
    type: ActionType;
    message: string;
    value: string;
}

export class HttpError extends Error {
    code: string;
    status: number;
    override: boolean;
    errors: FieldError[];
    action?: Action;

    constructor({
        code,
        message,
        status,
        override = false,
        errors = [],
        action,
    }: {
        code: string;
        message: string;
        status: number;
        override?: boolean;
        errors?: FieldError[];
        action?: Action;
    }) {
        super(message)
        this.name = 'HttpError';
        this.code = code;
        this.status = status;
        this.override = override;
        this.errors = errors;
        this.action = action;

        Object.setPrototypeOf(this, new.target.prototype);
    }

    withMessage(message: string): HttpError {
        return new HttpError({
            code: this.code,
            message,
            status: this.status,
            override: this.override,
            errors: this.errors,
            action: this.action
        });
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
            status: this.status,
            override: this.override,
            errors: this.errors,
            action: this.action
        };
    }
}

export function makeUpperCaseWithUnderscores(str: string): string {
    return str.toUpperCase().replace(/ /g, "_");
}

export function isHttpError(err: unknown): err is HttpError {
    return err instanceof HttpError;
}