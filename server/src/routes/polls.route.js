import { Router } from "express";

import PollController from "../controllers/poll.controller.js";

import {
    authMiddleware,
    optionalAuthMiddleware,
} from "../middleware/auth.middeleware.js";

const router = Router();

router.get(
    "/recent",
    PollController.getRecentPolls
);

router.get(
    "/",
    PollController.getRecentPolls
);

router.get(
    "/my-polls",
    authMiddleware,
    PollController.getUserPolls
);

router.post(
    "/",
    authMiddleware,
    PollController.createPoll
);

router.get(
    "/:pollId",
    optionalAuthMiddleware,
    PollController.getPollById
);

router.post(
    "/:pollId/vote",
    optionalAuthMiddleware,
    PollController.votePoll
);

router.get(
    "/:pollId/results",
    optionalAuthMiddleware,
    PollController.getPollResults
);

router.patch(
    "/:pollId/publish",
    authMiddleware,
    PollController.publishPollResults
);

export default router;