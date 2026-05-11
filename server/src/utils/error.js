export class ApiError extends Error {
    constructor(
        message = "Internal Server Error",
        statusCode = 500,
        errors = [],
        stack = ""
    ) {
        super(message);

        this.message = message;
        this.statusCode = statusCode;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    static badRequest(
        message = "Bad Request",
        errors = []
    ) {
        return new ApiError(message, 400, errors);
    }

    static unauthorized(
        message = "Unauthorized"
    ) {
        return new ApiError(message, 401);
    }

    static forbidden(
        message = "Forbidden"
    ) {
        return new ApiError(message, 403);
    }

    static notFound(
        message = "Resource Not Found"
    ) {
        return new ApiError(message, 404);
    }

    static conflict(
        message = "Conflict"
    ) {
        return new ApiError(message, 409);
    }

    static validationError(
        message = "Validation Error",
        errors = []
    ) {
        return new ApiError(message, 422, errors);
    }

    static internal(
        message = "Internal Server Error"
    ) {
        return new ApiError(message, 500);
    }
}
