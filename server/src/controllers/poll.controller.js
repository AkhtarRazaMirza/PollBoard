import PollService from "../services/poll.service.js";

import { ApiResponse } from "../utils/responce.js";
import { getPollRoom } from "../utils/socket.js";

class PollController {
    // create poll
    static async createPoll(
        req,
        res,
        next
    ) {
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
                        shareUrl: `/api/polls/${poll._id}`,
                    },
                    "Poll created successfully"
                )
            );
        } catch (error) {
            console.log(error)
            next(error);
        }
    }

    // recent polls
    static async getRecentPolls(
        req,
        res,
        next
    ) {
        try {
            const polls =
                await PollService.getRecentPolls(
                    req.query.limit
                );

            return res.status(200).json(
                new ApiResponse(
                    200,
                    polls,
                    "Recent polls fetched successfully"
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // user polls
    static async getUserPolls(
        req,
        res,
        next
    ) {
        try {
            const polls =
                await PollService.getUserPolls(
                    req.user?._id
                );

            return res.status(200).json(
                new ApiResponse(
                    200,
                    polls,
                    "User polls fetched successfully"
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
                    req.params.pollId,
                    req.user?._id
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
    static async votePoll(
        req,
        res,
        next
    ) {
        try {
            const vote =
                await PollService.votePoll({
                    pollId:
                        req.params.pollId,
                    userId: req.user?._id,
                    body: req.body,
                });

            const io = req.app.get("io");

            if (io && vote?.results) {
                io.to(
                    getPollRoom(
                        req.params.pollId
                    )
                ).emit(
                    "poll:results-updated",
                    {
                        pollId:
                            req.params.pollId,
                        results:
                            vote.results,
                        poll: vote.poll,
                    }
                );
            }

            return res.status(200).json(
                new ApiResponse(
                    200,
                    vote.response,
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
                    req.params.pollId,
                    req.user?._id
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

    // publish results
    static async publishPollResults(
        req,
        res,
        next
    ) {
        try {
            const data =
                await PollService.publishPollResults(
                    {
                        pollId:
                            req.params.pollId,
                        userId:
                            req.user?._id,
                    }
                );

            const io = req.app.get("io");

            if (io) {
                io.to(
                    getPollRoom(
                        req.params.pollId
                    )
                ).emit(
                    "poll:results-updated",
                    {
                        pollId:
                            req.params.pollId,
                        results:
                            data.results,
                        poll: data.poll,
                    }
                );
            }

            return res.status(200).json(
                new ApiResponse(
                    200,
                    data,
                    "Results published successfully"
                )
            );
        } catch (error) {
            next(error);
        }
    }
}

export default PollController;