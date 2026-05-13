import { Router } from "express";

import PollController from "../controllers/poll.controller.js";

import {
    authMiddleware,
    optionalAuthMiddleware,
} from "../middleware/auth.middeleware.js";
import { voteRateLimiter }
    from "../middleware/rate-limit.middleware.js";
import { validateBody }
    from "../middleware/validation.middleware.js";
import {
    createPollSchema,
    publishResultsSchema,
    votePollSchema,
}
    from "../validators/poll.validators.js";
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
    validateBody(createPollSchema),
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
    voteRateLimiter,
    validateBody(votePollSchema),
    PollController.votePoll
);

router.get(
    "/:pollId/results",
    optionalAuthMiddleware,
    validateBody(
        publishResultsSchema
    ),
    PollController.getPollResults
);

router.patch(
    "/:pollId/publish",
    authMiddleware,
    PollController.publishPollResults
);

export default router;