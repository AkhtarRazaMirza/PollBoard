import crypto from "node:crypto";

import { ApiError } from "./error.js";

export const anonymousVoterTokenHeader =
    "x-pollboard-voter-token";

const minimumTokenLength = 16;
const maximumTokenLength = 512;

export const normalizeAnonymousVoterToken = (
    token
) => {
    const normalizedToken =
        typeof token === "string"
            ? token.trim()
            : "";

    if (!normalizedToken) {
        throw ApiError.badRequest(
            "Anonymous voter token is required"
        );
    }

    if (
        normalizedToken.length <
            minimumTokenLength ||
        normalizedToken.length >
            maximumTokenLength
    ) {
        throw ApiError.badRequest(
            "Anonymous voter token is invalid"
        );
    }

    return normalizedToken;
};

export const hashAnonymousVoterToken = (
    token
) =>
    crypto
        .createHash("sha256")
        .update(
            normalizeAnonymousVoterToken(
                token
            )
        )
        .digest("hex");