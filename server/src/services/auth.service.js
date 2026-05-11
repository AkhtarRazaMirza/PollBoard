import bcrypt from "bcryptjs";

import { User } from "../models/user.models.js";

import { ApiError }
from "../utils/error.js";

import { TokenService }
from "../utils/token.js";

export class AuthService {

    // REGISTER
    static register = async (
        userData
    ) => {

        const {
            firstName,
            lastName,
            email,
            password,
        } = userData;

        // VALIDATION

        if (
            !firstName ||
            !lastName ||
            !email ||
            !password
        ) {

            throw ApiError.badRequest(
                "All fields are required"
            );
        }

        // CHECK EXISTING USER

        const existingUser =
            await User.findOne({
                email,
            });

        if (existingUser) {

            throw ApiError.conflict(
                "Email already exists"
            );
        }

        // HASH PASSWORD

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        // CREATE USER

        const user =
            await User.create({
                firstName,
                lastName,
                email,
                password:
                    hashedPassword,
            });

        // SAFE USER

        const safeUser = {
            _id: user._id,
            firstName:
                user.firstName,
            lastName:
                user.lastName,
            email: user.email,
            createdAt:
                user.createdAt,
        };

        // RETURN

        return {
            user: safeUser,
        };
    };

    // LOGIN
    static login = async (
        userData
    ) => {

        const {
            email,
            password,
        } = userData;

        // VALIDATION

        if (
            !email ||
            !password
        ) {

            throw ApiError.badRequest(
                "Email and password are required"
            );
        }

        // FIND USER

        const user =
            await User.findOne({
                email,
            });

        if (!user) {

            throw ApiError.unauthorized(
                "Invalid email or password"
            );
        }

        // VERIFY PASSWORD

        const isPasswordValid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isPasswordValid) {

            throw ApiError.unauthorized(
                "Invalid email or password"
            );
        }

        // GENERATE TOKENS
        const accessToken =
            TokenService.generateAccessToken({
                id: user._id,
            });

        const refreshToken =
            TokenService.generateRefreshToken({
                id: user._id,
            });

        // SAFE USER

        const safeUser = {
            _id: user._id,
            firstName:
                user.firstName,
            lastName:
                user.lastName,
            email: user.email,
            createdAt:
                user.createdAt,
        };

        // RETURN

        return {
            user: safeUser,
            accessToken,
            refreshToken,
        };
    };

    // CURRENT USER
    static me = async (
        userId
    ) => {

        const user =
            await User.findById(
                userId
            ).select("-password");

        if (!user) {

            throw ApiError.notFound(
                "User not found"
            );
        }

        return user;
    };

    // LOGOUT
    static logout = async () => {
        return {
            message:
                "Logout successful",
        };
    };
}