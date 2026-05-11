import PollService from "../services/poll.service.js";

import { ApiResponse } from "../utils/responce.js";

class PollController {
    // create poll
    static async createPoll(req, res, next) {
        try {
            const poll =
                await PollService.createPoll({
                    ...req.body,
                    creator: req.user?._id,
                });

            return res.status(201).json(
                new ApiResponse(
                    201,
                    {
                        poll,
                        shareUrl: `/api/v1/polls/${poll._id}`,
                    },
                    "Poll created successfully"
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // get poll
    static async getPollById(
        req,
        res,
        next
    ) {
        try {
            const poll =
                await PollService.getPollById(
                    req.params.pollId
                );

            return res.status(200).json(
                new ApiResponse(
                    200,
                    poll,
                    "Poll fetched successfully"
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // vote poll
    static async votePoll(req, res, next) {
        try {
            const vote = await PollService.votePoll({
                pollId: req.params.pollId,
                userId: req.user?._id,
                body: req.body,
            });

            return res.status(200).json(
                new ApiResponse(
                    200,
                    vote,
                    "Vote submitted successfully"
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // get poll results
    static async getPollResults(
        req,
        res,
        next
    ) {
        try {
            const results =
                await PollService.getPollResults(
                    req.params.pollId
                );

            return res.status(200).json(
                new ApiResponse(
                    200,
                    results,
                    "Poll results fetched successfully"
                )
            );
        } catch (error) {
            next(error);
        }
    }
}

export default PollController;