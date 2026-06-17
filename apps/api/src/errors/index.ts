import { HttpError, makeUpperCaseWithUnderscores, type FieldError, type Action } from "./http.error";
export * from "./http.error";

export function newUnauthorizedError(message: string, override = false) {
    return new HttpError({
        code: makeUpperCaseWithUnderscores("Unauthorized"),
        message,
        status: 401,
        override,
    });
}

export function newForbiddenError(message: string, override = false) {
    return new HttpError({
        code: makeUpperCaseWithUnderscores("Forbidden"),
        message,
        status: 403,
        override,
    });
}

export function newBadRequestError({
    message,
    override = false,
    code,
    errors = [],
    action,
}: {
    message: string;
    override?: boolean;
    code?: string;
    errors?: FieldError[];
    action?: Action;
}): HttpError {
    return new HttpError({
        code: code ?? makeUpperCaseWithUnderscores("Bad Request"),
        message,
        status: 400,
        override,
        errors,
        action,
    });
}

export function newNotFoundError(message: string, override = false, code?: string): HttpError {
    return new HttpError({
        code: code ?? makeUpperCaseWithUnderscores("Not Found"),
        message,
        status: 404,
        override,
    });
}

export function newInternalServerError(): HttpError {
    return new HttpError({
        code: makeUpperCaseWithUnderscores("Internal Server Error"),
        message: "Internal Server Error",
        status: 500,
        override: false,
    });
}

export function newValidationError(err: Error, errors: FieldError[] = []): HttpError {
    return newBadRequestError({
        message: `Validation failed: ${err.message}`,
        errors,
    });
}