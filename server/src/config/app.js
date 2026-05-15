import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "../routes/auth.route.js";
import pollsRoutes from "../routes/polls.route.js";
import {
    corsOptions,
} from "./cors.js";
import {
    errorHandlerMiddleware,
    notFoundMiddleware,
} from "../middleware/error.middleware.js";

export function createApp() {
    const app = express();

    app.set("trust proxy", 1);

    app.use(
        helmet({
            crossOriginResourcePolicy:
                false,
        })
    );

    app.use(
        cors({
            origin: true,
            credentials: true,
        })
    );

    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max:
                Number(
                    process.env.RATE_LIMIT_MAX
                ) || 200,
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                success: false,
                statusCode: 429,
                message:
                    "Too many requests. Please try again in a bit.",
            },
        })
    );

    app.use(
        express.json({
            limit: "1mb",
        })
    );

    app.get("/health", (_req, res) => {
        res.status(200).json({
            status: "Server is running",
            timestamp:
                new Date().toISOString(),
        });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/polls", pollsRoutes);

    app.use(notFoundMiddleware);
    app.use(errorHandlerMiddleware);

    return app;
}