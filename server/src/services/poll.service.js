import mongoose from "mongoose";

import { Response } from "../models/response.models.js";
import { Poll } from "../models/poll.models.js";
import { ApiResponse } from "../utils/responce.js";

import { ApiError } from "../utils/error.js";

class PollService {
    // create poll
    static async createPoll(data) {
        const {
            pollTitle,
            pollDescription,
            questions,
            isAnonymous,
            expiresAt,
            timePerQuestion,
            creator,
        } = data;

        // validations
        if (!pollTitle?.trim()) {
            throw new ApiError(
                400,
                "Poll title is required"
            );
        }

        if (
            !Array.isArray(questions) ||
            questions.length === 0
        ) {
            throw new ApiError(
                400,
                "Poll must contain at least one question"
            );
        }

        // create poll
        const poll = await Poll.create({
            pollTitle,
            pollDescription,
            creator,
            questions,
            isAnonymous,
            expiresAt,
            timePerQuestion,
        });

        if (!poll) {
            throw new ApiError(
                500,
                "Something went wrong while creating poll"
            );
        }

        return poll;
    }

    // get poll by id
    static async getPollById(pollId) {
        // validate mongo id
        if (
            !mongoose.Types.ObjectId.isValid(
                pollId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid poll ID"
            );
        }

        // find poll
        const poll = await Poll.findById(
            pollId
        ).populate(
            "creator",
            "username fullName"
        );

        if (!poll) {
            throw new ApiError(
                404,
                "Poll not found"
            );
        }

        return poll;
    }

    // vote poll
    // vote poll
    static async votePoll(data) {
        const { pollId, userId, body } = data;

        const { answers } = body;

        // validate poll id
        if (
            !mongoose.Types.ObjectId.isValid(
                pollId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid poll ID"
            );
        }

        // validate answers
        if (
            !Array.isArray(answers) ||
            answers.length === 0
        ) {
            throw new ApiError(
                400,
                "Answers are required"
            );
        }

        // find poll
        const poll = await Poll.findById(
            pollId
        );

        if (!poll) {
            throw new ApiError(
                404,
                "Poll not found"
            );
        }

        // check poll expiry
        if (
            poll.expiresAt &&
            poll.expiresAt < new Date()
        ) {
            throw new ApiError(
                400,
                "Poll has expired"
            );
        }

        // check duplicate vote
        const alreadyVoted =
            await Response.findOne({
                poll: pollId,
                respondent: userId,
            });

        if (alreadyVoted) {
            throw new ApiError(
                400,
                "You have already voted in this poll"
            );
        }

        // create response
        const response =
            await Response.create({
                poll: pollId,
                respondent: userId,
                answers,
            });

        if (!response) {
            throw new ApiError(
                500,
                "Something went wrong while submitting vote"
            );
        }

        return response;
    }

    // get poll results
    static async getPollResults(pollId) {
        // validate poll id
        if (
            !mongoose.Types.ObjectId.isValid(
                pollId
            )
        ) {
            throw new ApiError(
                400,
                "Invalid poll ID"
            );
        }

        // find poll
        const poll = await Poll.findById(
            pollId
        );

        if (!poll) {
            throw new ApiError(
                404,
                "Poll not found"
            );
        }

        // get all responses
        const responses =
            await Response.find({
                poll: pollId,
            });

        // total votes
        const totalVotes =
            responses.length;

        // generate results
        const results =
            poll.questions.map((question) => {
                const optionCounts = {};

                // initialize options count
                question.options.forEach(
                    (option) => {
                        optionCounts[option] = 0;
                    }
                );

                // count votes
                responses.forEach(
                    (response) => {
                        response.answers.forEach(
                            (answer) => {
                                if (
                                    answer.questionId.toString() ===
                                    question._id.toString()
                                ) {
                                    optionCounts[
                                        answer.selectedOption
                                    ]++;
                                }
                            }
                        );
                    }
                );

                return {
                    questionId:
                        question._id,
                    question:
                        question.questionText,
                    results: optionCounts,
                };
            });

        return {
            pollId: poll._id,
            pollTitle:
                poll.pollTitle,
            totalVotes,
            results,
        };
    }
}

export default PollService;