import { Router } from "express";

import PollController from "../controllers/poll.controller.js";

import { authMiddleware } from "../middleware/auth.middeleware.js";

const router = Router();

router.use(authMiddleware);

// create poll
router.post("/", PollController.createPoll);

// get poll
router.get("/:pollId", PollController.getPollById);

// vote on poll
router.post("/:pollId/vote", PollController.votePoll);

// get results
router.get(
    "/:pollId/results",
    PollController.getPollResults
);

export default router;