import jwt from "jsonwebtoken";

export class TokenService {

    // GENERATE ACCESS TOKEN
    static generateAccessToken(payload) {

        return jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            {
                expiresIn:
                    process.env
                        .JWT_ACCESS_EXPIRES_IN,
            }
        );
    }

    // GENERATE REFRESH TOKEN
    static generateRefreshToken(payload) {

        return jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn:
                    process.env
                        .JWT_REFRESH_EXPIRES_IN,
            }
        );
    }

    // VERIFY ACCESS TOKEN
    static verifyAccessToken(token) {

        return jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
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