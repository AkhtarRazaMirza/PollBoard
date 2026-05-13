import { ApiError } from "../utils/error.js";
import { ZodError } from "zod";

export const notFoundMiddleware = (
  req,
  res,
  next
) => {
  next(
    ApiError.notFound(
      `Route ${req.originalUrl} not found`
    )
  );
};

export const errorHandlerMiddleware = (
  error,
  req,
  res,
  next
) => {
  void next;
  let normalizedError = error;

  if (
    error?.name ===
    "ValidationError"
  ) {
    normalizedError =
      ApiError.validationError(
        "Validation failed",
        Object.values(
          error.errors || {}
        ).map(
          (item) =>
            item.message
        )
      );
  } else if (
    error instanceof ZodError
  ) {
    normalizedError =
      ApiError.validationError(
        "Validation failed",
        error.issues.map(
          (issue) =>
            issue.message
        )
      );
  } else if (
    error?.name === "CastError"
  ) {
    normalizedError =
      ApiError.badRequest(
        "Invalid request data"
      );
  } else if (error?.code === 11000) {
    const duplicateMessage =
      error?.keyPattern
        ?.respondent
        ? "You have already voted in this poll"
        : error
          ?.keyPattern
          ?.anonymousVoterHash
          ? "This device has already voted in this poll"
          : "A record with this value already exists";
    normalizedError =
      ApiError.conflict(
        duplicateMessage
      );
  } else if (
    !(error instanceof ApiError)
  ) {
    normalizedError =
      ApiError.internal(
        error?.message ||
        "Internal Server Error"
      );
  }

  return res
    .status(
      normalizedError.statusCode
    )
    .json({
      success: false,
      statusCode:
        normalizedError.statusCode,
      message:
        normalizedError.message,
      errors:
        normalizedError.errors ||
        [],
    });
};