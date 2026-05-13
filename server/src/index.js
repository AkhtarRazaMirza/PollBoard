import http from "node:http";
import dotenv from "dotenv";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js";
import { createApp } from "./config/app.js";
import {
    corsOptions,
} from "./config/cors.js";
import { getPollRoom } from "./utils/socket.js";

dotenv.config();

async function main() {
    try {
        await connectDB();

        const app = createApp();
        const port =
            process.env.PORT || 8080;
        const server =
            http.createServer(app);

        const io = new Server(server, {
            cors: corsOptions,
        });

        app.set("io", io);

        io.on("connection", (socket) => {
            socket.on(
                "poll:join",
                (pollId) => {
                    if (!pollId) {
                        return;
                    }

                    socket.join(
                        getPollRoom(pollId)
                    );
                }
            );

            socket.on(
                "poll:leave",
                (pollId) => {
                    if (!pollId) {
                        return;
                    }

                    socket.leave(
                        getPollRoom(pollId)
                    );
                }
            );
        });

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