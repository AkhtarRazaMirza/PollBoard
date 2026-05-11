import { AuthService } from "../services/auth.service.js";

import { ApiResponse } from "../utils/responce.js";

import { ApiError } from "../utils/error.js";

export class AuthController {

    // REGISTER
    static register = async (
        req,
        res,
        next
    ) => {

        try {

            const userData =
                await AuthService.register(
                    req.body
                );

            return res.status(201).json(
                ApiResponse.created(
                    "User registered successfully",
                    userData
                )
            );

        } catch (error) {

            next(error);
        }
    };

    // LOGIN
    static login = async (
        req,
        res,
        next
    ) => {

        try {

            const userData =
                await AuthService.login(
                    req.body
                );

            return res.status(200).json(
                ApiResponse.success(
                    "Login successful",
                    userData
                )
            );

        } catch (error) {

            next(error);
        }
    };

    // CURRENT USER
    static me = async (
        req,
        res,
        next
    ) => {

        try {

            if (!req.user) {

                throw ApiError.unauthorized(
                    "Unauthorized access"
                );
            }

            const user =
                await AuthService.me(
                    req.user._id
                );

            return res.status(200).json(
                ApiResponse.fetched(
                    "User fetched successfully",
                    user
                )
            );

        } catch (error) {

            next(error);
        }
    };

    // LOGOUT
    static logout = async (
        req,
        res,
        next
    ) => {

        try {

            const data =
                await AuthService.logout();

            return res.status(200).json(
                ApiResponse.success(
                    data.message
                )
            );

        } catch (error) {

            next(error);
        }
    };
}