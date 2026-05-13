import jwt from "jsonwebtoken";

const getEnvValue = (...keys) =>
    keys.find((key) =>
        Boolean(process.env[key])
    )
        ? process.env[
              keys.find((key) =>
                  Boolean(
                      process.env[key]
                  )
              )
          ]
        : undefined;

const getRequiredEnvValue = (
    label,
    ...keys
) => {
    const value = getEnvValue(...keys);

    if (!value) {
        throw new Error(
            `${label} is not configured`
        );
    }

    return value;
};

const getAccessTokenSecret = () =>
    getRequiredEnvValue(
        "Access token secret",
        "JWT_ACCESS_SECRET",
        "ACCESS_TOKEN_SECRET"
    );

const getRefreshTokenSecret = () =>
    getRequiredEnvValue(
        "Refresh token secret",
        "JWT_REFRESH_SECRET",
        "REFRESH_TOKEN_SECRET"
    );

const getAccessTokenExpiry = () =>
    getEnvValue(
        "JWT_ACCESS_EXPIRES_IN",
        "ACCESS_TOKEN_EXPIRES_IN"
    ) || "15m";

const getRefreshTokenExpiry = () =>
    getEnvValue(
        "JWT_REFRESH_EXPIRES_IN",
        "REFRESH_TOKEN_EXPIRES_IN"
    ) || "7d";

export class TokenService {

    // GENERATE ACCESS TOKEN
    static generateAccessToken(payload) {

        return jwt.sign(
            payload,
            getAccessTokenSecret(),
            {
                expiresIn:
                    getAccessTokenExpiry(),
            }
        );
    }

    // GENERATE REFRESH TOKEN
    static generateRefreshToken(payload) {
         return jwt.sign(
            payload,
            getRefreshTokenSecret(),
            {
                expiresIn:
                    getRefreshTokenExpiry(),
            }
        );
    }

    // VERIFY ACCESS TOKEN
    static verifyAccessToken(token) {
         return jwt.verify(
            token,
            getAccessTokenSecret()
        );
    }

    // VERIFY REFRESH TOKEN
    static verifyRefreshToken(token) {
        return jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
        );
    }
}