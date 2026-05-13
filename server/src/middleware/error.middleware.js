import { ApiError } from "../utils/error.js";

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
    error?.name === "CastError"
  ) {
    normalizedError =
      ApiError.badRequest(
        "Invalid request data"
      );
  } else if (error?.code === 11000) {
    normalizedError =
      ApiError.conflict(
        "A record with this value already exists"
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