import { User } from "../models/user.models.js";

import { ApiError } from "../utils/error.js";
import { TokenService } from "../utils/token.js";

const getAuthorizationToken = (
    req
) => {
    const authHeader =
        req.headers.authorization;

    if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
    ) {
        return null;
    }

    return authHeader.split(" ")[1];
};

const resolveUserFromRequest =
    async (req) => {
        const token =
            getAuthorizationToken(req);

        if (!token) {
            throw ApiError.unauthorized(
                "Access token missing"
            );
        }

        const decoded =
            TokenService.verifyAccessToken(
                token
            );

        const user =
            await User.findById(
                decoded.id
            ).select("-password");

        if (!user) {
            throw ApiError.unauthorized(
                "User not found"
            );
        }

        return user;
    };

const normalizeAuthError = (
    error
) => {
    if (
        error.name ===
        "TokenExpiredError"
    ) {
        return ApiError.unauthorized(
            "Access token expired"
        );
    }

    if (
        error.name ===
        "JsonWebTokenError"
    ) {
        return ApiError.unauthorized(
            "Invalid access token"
        );
    }

    return error;
};

export const authMiddleware =
    async (req, _res, next) => {
        try {
            req.user =
                await resolveUserFromRequest(
                    req
                );

            next();
        } catch (error) {
            next(
                normalizeAuthError(error)
            );
        }
    };

export const optionalAuthMiddleware =
    async (req, _res, next) => {
        try {
            const token =
                getAuthorizationToken(req);

            if (!token) {
                req.user = null;
                next();
                return;
            }

            req.user =
                await resolveUserFromRequest(
                    req
                );
        } catch {
            req.user = null;
        }

        next();
    };