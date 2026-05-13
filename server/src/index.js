import http from "node:http";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import { createApp } from "./config/app.js";
import {
    corsOptions,
} from "./config/cors.js";
import {
    initializeSocketServer,
} from "./utils/socket.js";

dotenv.config();

async function main() {
    try {
        await connectDB();

        const app = createApp();
        const port =
            process.env.PORT || 8080;
        const server =
            http.createServer(app);

        const io =
            initializeSocketServer(
                server,
                {
                    cors: corsOptions,
                }
            );

        app.set("io", io);

        server.listen(port, () => {
            console.log(
                `Server is running on port ${port}`
            );
        });

    } catch (error) {
        console.error(
            "Error starting server:",
            error
        );
    }
}

main();