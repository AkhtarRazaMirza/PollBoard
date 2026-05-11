import { User } from "../models/user.models.js";

import { ApiError }
from "../utils/error.js";

import { TokenService }
from "../utils/token.js";

export const authMiddleware =
    async (req, res, next) => {

        try {
            // GET AUTH HEADE
            const authHeader =
                req.headers.authorization;

            // CHECK TOKEN EXIST
            if (
                !authHeader ||
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                throw ApiError.unauthorized(
                    "Access token missing"
                );
            }

            // EXTRACT TOKE
            const token =
                authHeader.split(" ")[1];

            // VERIFY TOKEN
            const decoded =
                TokenService.verifyAccessToken(
                    token
                );

            // FIND USER
            const user =
                await User.findById(
                    decoded.id
                ).select("-password");

            // CHECK USER EXIST
            if (!user) {
                throw ApiError.unauthorized(
                    "User not found"
                );
            }

            // ATTACH USE
            req.user = user;

            next();

        } catch (error) {

            // JWT EXPIRED
            if (
                error.name ===
                "TokenExpiredError"
            ) {

                return next(
                    ApiError.unauthorized(
                        "Access token expired"
                    )
                );
            }

            // INVALID TOKEN
            if (
                error.name ===
                "JsonWebTokenError"
            ) {

                return next(
                    ApiError.unauthorized(
                        "Invalid access token"
                    )
                );
            }

            next(error);
        }
    };