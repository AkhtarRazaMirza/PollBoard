import express from "express";
import authRoutes from "../routes/auth.route.js";
import pollsRoutes from "../routes/polls.route.js";

// import cookieParser from "cookie-parser";
import cors from "cors";

export function createApp() {
  const app = express();

  // CORS
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );

  // JSON PARSER
  app.use(express.json());

  // COOKIE PARSER
//   app.use(cookieParser());

  // HEALTH CHECK
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "✅ Server is running",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/polls", pollsRoutes);

  return app;
}