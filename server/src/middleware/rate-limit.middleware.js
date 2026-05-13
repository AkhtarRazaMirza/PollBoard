import rateLimit from "express-rate-limit";

const createLimiter = ({
    windowMs,
    max,
    message,
}) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            statusCode: 429,
            message,
        },
    });

export const authRateLimiter =
    createLimiter({
        windowMs: 15 * 60 * 1000,
        max:
            Number(
                process.env
                    .AUTH_RATE_LIMIT_MAX
            ) || 20,
        message:
            "Too many authentication attempts. Please try again shortly.",
    });

export const voteRateLimiter =
    createLimiter({
        windowMs: 10 * 60 * 1000,
        max:
            Number(
                process.env
                    .VOTE_RATE_LIMIT_MAX
            ) || 60,
        message:
            "Too many vote attempts. Please slow down and try again.",
    });