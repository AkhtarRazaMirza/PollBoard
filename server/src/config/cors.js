const defaultClientOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
];

export const getAllowedOrigins = () => {
    const configuredOrigins =
        process.env.CLIENT_URLS ||
        process.env.CLIENT_URL ||
        "";

    const parsedOrigins =
        configuredOrigins
            .split(",")
            .map((origin) =>
                origin.trim()
            )
            .filter(Boolean);

    return parsedOrigins.length > 0
        ? parsedOrigins
        : defaultClientOrigins;
};

export const corsOptions = {
    origin(origin, callback) {
        const allowedOrigins =
            getAllowedOrigins();

        if (
            !origin ||
            allowedOrigins.includes(origin)
        ) {
            callback(null, true);
            return;
        }

        callback(
            new Error(
                "Origin not allowed by CORS"
            )
        );
    },
    credentials: true,
};