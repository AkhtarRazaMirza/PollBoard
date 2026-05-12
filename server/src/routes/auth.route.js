import { Router } from "express";

import { AuthController }
from "../controllers/auth.controller.js";

import { authMiddleware }
from "../middleware/auth.middeleware.js";

const router = Router();

// AUTH ROUTES

// Register User
router.post(
    "/signup",
    AuthController.register
);

// Login User
router.post(
    "/login",
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