import { Router } from "express";

import { AuthController }
from "../controllers/auth.controller.js";

import { authMiddleware }
from "../middleware/auth.middeleware.js";
import { authRateLimiter }
from "../middleware/rate-limit.middleware.js";
import { validateBody }
from "../middleware/validation.middleware.js";
import {
    loginSchema,
    signupSchema,
}
from "../validators/auth.validators.js";

const router = Router();

// AUTH ROUTES

// Register User
router.post(
    "/signup",
    authRateLimiter,
    validateBody(signupSchema),
    AuthController.register
);

// Login User
router.post(
    "/login",
    authRateLimiter,
    validateBody(loginSchema),
    AuthController.login
);

// CURRENT USER
router.get(
    "/me",
    authMiddleware,
    AuthController.me
);

// LOGOUT
router.post(
    "/logout",
    authMiddleware,
    AuthController.logout
);

export default router;