import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  res.json({ message: `Login attempt for ${username} with password ${password}` });
});

router.post("/register", (req, res) => {
  const { username, password } = req.body;
  res.json({ message: `Registration attempt for ${username} with password ${password}` });
});

router.post("/logout", (req, res) => {
  res.json({ message: "Logout attempt" });
});

router.get("/me", (req, res) => {
  res.json({ message: "Fetching current user info" });
});

router.get("/google", (req, res) => {
    res.json({ message: "Google OAuth attempt" });
});

router.get("/google/callback", (req, res) => {
    res.json({ message: "Google OAuth callback" });
});

router.get("/github", (req, res) => {
    res.json({ message: "GitHub OAuth attempt" });
});

router.get("/github/callback", (req, res) => {
    res.json({ message: "GitHub OAuth callback" });
});

export default router;