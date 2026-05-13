import mongoose from "mongoose";

import { Poll } from "../models/poll.models.js";
import { Response } from "../models/response.models.js";
import {
    buildPollResultsPayload,
    buildResponseCountMap,
    getQuestionRequiredFlag,
    getVoteAccess,
    isPollExpired,
    serializePoll,
    voteAccessTypes,
} from "./poll-analytics.service.js";
import { ApiError } from "../utils/error.js";
import {
    hashAnonymousVoterToken,
} from "../utils/voter.js";

const normalizeExpiryDate = (
    value
) => {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        throw ApiError.badRequest(
            "Expiry date is invalid"
        );
    }

    if (parsedDate <= new Date()) {
        throw ApiError.badRequest(
            "Expiry date must be in the future"
        );
    }

    return parsedDate;
};

const normalizeVoteAccess = (
    voteAccess,
    isAnonymous
) => {
    if (
        voteAccess ===
            voteAccessTypes.anonymous ||
        voteAccess ===
            voteAccessTypes.authenticated
    ) {
        return voteAccess;
    }

    return isAnonymous
        ? voteAccessTypes.anonymous
        : voteAccessTypes.authenticated;
};

const normalizeQuestions = (
    questions
) =>
    questions.map(
        (question = {}) => {
            const required =
                getQuestionRequiredFlag(
                    question
                );

            return {
                questionText:
                    (
                        question.questionText ||
                        question.prompt ||
                        question.question ||
                        question.text ||
                        ""
                    ).trim(),
                options: (
                    question.options || []
                )
                    .map((option) =>
                        (
                            typeof option ===
                            "string"
                                ? option
                                : option?.text ||
                                  option?.label ||
                                  option?.value ||
                                  ""
                        ).trim()
                    )
                    .filter(Boolean),
                required,
                isRequired: required,
            };
        }
    );

const validateQuestions = (
    questions
) => {
    if (
        !Array.isArray(questions) ||
        questions.length === 0
    ) {
        throw ApiError.badRequest(
            "Poll must contain at least one question"
        );
    }

    const validationErrors = [];

    questions.forEach(
        (question, index) => {
            if (!question.questionText) {
                validationErrors.push(
                    `Question ${
                        index + 1
                    } must have text`
                );
            }

            if (
                question.options.length < 2
            ) {
                validationErrors.push(
                    `Question ${
                        index + 1
                    } must have at least two options`
                );
            }

            const uniqueOptions =
                new Set(
                    question.options.map(
                        (option) =>
                            option.toLowerCase()
                    )
                );

            if (
                uniqueOptions.size !==
                question.options.length
            ) {
                validationErrors.push(
                    `Question ${
                        index + 1
                    } contains duplicate options`
                );
            }
        }
    );

    if (
        validationErrors.length > 0
    ) {
        throw ApiError.validationError(
            "Please fix the poll questions",
            validationErrors
        );
    }
};

class PollService {
    static validatePollId(
        pollId
    ) {
        if (
            !mongoose.Types.ObjectId.isValid(
                pollId
            )
        ) {
            throw ApiError.badRequest(
                "Invalid poll ID"
            );
        }
    }

    static async closePollIfNeeded(
        poll
    ) {
        let shouldSave = false;

        if (
            isPollExpired(poll) &&
            !poll.isClosed
        ) {
            poll.isClosed = true;
            shouldSave = true;
        }

        if (
            poll.resultsPublished &&
            !poll.isClosed
        ) {
            poll.isClosed = true;
            shouldSave = true;
        }

        if (shouldSave) {
            await poll.save();
        }
    }

    static async getPollDocument(
        pollId,
        {
            populateCreator = false,
        } = {}
    ) {
        this.validatePollId(pollId);

        const query =
            Poll.findById(pollId);

        if (populateCreator) {
            query.populate(
                "creator",
                "firstName lastName email"
            );
        }

        const poll =
            await query.exec();

        if (!poll) {
            throw ApiError.notFound(
                "Poll not found"
            );
        }

        await this.closePollIfNeeded(
            poll
        );

        return poll;
    }

    static ensurePollCanReceiveVotes(
        poll
    ) {
        if (
            poll.resultsPublished
        ) {
            throw ApiError.badRequest(
                "Results are already published and this poll is closed"
            );
        }

        if (isPollExpired(poll)) {
            throw ApiError.badRequest(
                "Poll has expired"
            );
        }

        if (poll.isClosed) {
            throw ApiError.badRequest(
                "Poll is closed"
            );
        }
    }

    static validateAnswers(
        poll,
        answers
    ) {
        if (
            !Array.isArray(answers)
        ) {
            throw ApiError.badRequest(
                "Answers are required"
            );
        }

        const pollQuestions =
            poll.questions || [];
        const questionMap =
            new Map(
                pollQuestions.map(
                    (question) => [
                        String(question._id),
                        question,
                    ]
                )
            );
        const validationErrors = [];
        const answeredQuestionIds =
            new Set();
        const normalizedAnswers = [];

        answers.forEach(
            (answer, index) => {
                const questionId =
                    String(
                        answer?.questionId ||
                            ""
                    );
                const selectedOption =
                    (
                        answer?.selectedOption ||
                        answer?.optionText ||
                        answer?.answer ||
                        ""
                    ).trim();
                const question =
                    questionMap.get(
                        questionId
                    );

                if (!question) {
                    validationErrors.push(
                        `Answer ${
                            index + 1
                        } references an invalid question`
                    );
                    return;
                }

                if (
                    answeredQuestionIds.has(
                        questionId
                    )
                ) {
                    validationErrors.push(
                        `Question ${
                            index + 1
                        } has more than one answer`
                    );
                    return;
                }

                if (!selectedOption) {
                    validationErrors.push(
                        `Question ${
                            index + 1
                        } is missing a selected option`
                    );
                    return;
                }

                if (
                    !question.options.includes(
                        selectedOption
                    )
                ) {
                    validationErrors.push(
                        `Selected option for "${
                            question.questionText
                        }" is invalid`
                    );
                    return;
                }

                answeredQuestionIds.add(
                    questionId
                );
                normalizedAnswers.push({
                    questionId:
                        question._id,
                    selectedOption,
                });
            }
        );

        pollQuestions.forEach(
            (question) => {
                if (
                    getQuestionRequiredFlag(
                        question
                    ) &&
                    !answeredQuestionIds.has(
                        String(question._id)
                    )
                ) {
                    validationErrors.push(
                        `Please answer "${
                            question.questionText
                        }"`
                    );
                }
            }
        );

        if (
            validationErrors.length > 0
        ) {
            throw ApiError.validationError(
                "Please answer all required questions",
                validationErrors
            );
        }

        if (
            normalizedAnswers.length === 0
        ) {
            throw ApiError.badRequest(
                "At least one answer is required"
            );
        }

        return normalizedAnswers;
    }

    static async buildPollResults(
        poll,
        {
            requesterId = null,
            bypassAccessCheck = false,
            viewerCount = null,
        } = {}
    ) {
        const responses =
            await Response.find({
                poll: poll._id,
            }).lean();

        return buildPollResultsPayload({
            poll,
            responses,
            requesterId,
            bypassAccessCheck,
            viewerCount,
        });
    }

    static async createPoll(data) {
        const {
            pollTitle,
            title,
            pollDescription,
            description,
            questions,
            isAnonymous,
            voteAccess,
            expiresAt,
            timePerQuestion,
            creator,
        } = data;

        if (!creator) {
            throw ApiError.unauthorized(
                "Unauthorized"
            );
        }

        const resolvedTitle =
            pollTitle || title || "";

        if (!resolvedTitle.trim()) {
            throw ApiError.badRequest(
                "Poll title is required"
            );
        }

        const normalizedQuestions =
            normalizeQuestions(
                questions || []
            );

        validateQuestions(
            normalizedQuestions
        );

        const normalizedVoteAccess =
            normalizeVoteAccess(
                voteAccess,
                isAnonymous
            );

        const poll =
            await Poll.create({
                pollTitle:
                    resolvedTitle.trim(),
                pollDescription:
                    (
                        pollDescription ||
                        description ||
                        ""
                    ).trim(),
                creator,
                questions:
                    normalizedQuestions,
                isAnonymous:
                    normalizedVoteAccess ===
                    voteAccessTypes.anonymous,
                voteAccess:
                    normalizedVoteAccess,
                resultsPublished:
                    false,
                isPublished: false,
                isClosed: false,
                expiresAt:
                    normalizeExpiryDate(
                        expiresAt
                    ),
                timePerQuestion,
            });

        return serializePoll(poll, {
            requesterId: creator,
            responseCount: 0,
        });
    }

    static async getUserPolls(
        userId
    ) {
        if (!userId) {
            throw ApiError.unauthorized(
                "Unauthorized"
            );
        }

        const polls =
            await Poll.find({
                creator: userId,
            })
                .sort({
                    createdAt: -1,
                })
                .lean();
        const responseCountMap =
            await buildResponseCountMap(
                polls.map(
                    (poll) => poll._id
                )
            );

        return polls.map((poll) =>
            serializePoll(poll, {
                requesterId: userId,
                responseCount:
                    responseCountMap.get(
                        String(poll._id)
                    ) || 0,
            })
        );
    }

    static async getRecentPolls(
        limit = 6
    ) {
        const normalizedLimit =
            Math.min(
                Math.max(
                    Number(limit) || 6,
                    1
                ),
                12
            );
        const polls =
            await Poll.find({})
                .sort({
                    createdAt: -1,
                })
                .limit(normalizedLimit)
                .lean();
        const responseCountMap =
            await buildResponseCountMap(
                polls.map(
                    (poll) => poll._id
                )
            );

        return polls.map((poll) =>
            serializePoll(poll, {
                responseCount:
                    responseCountMap.get(
                        String(poll._id)
                    ) || 0,
            })
        );
    }

    static async getPollById(
        pollId,
        requesterId = null
    ) {
        const poll =
            await this.getPollDocument(
                pollId,
                {
                    populateCreator: true,
                }
            );
        const responseCount =
            await Response.countDocuments({
                poll: poll._id,
            });

        return serializePoll(poll, {
            requesterId,
            responseCount,
        });
    }

    static async votePoll(data) {
        const {
            pollId,
            userId,
            body,
            anonymousVoterToken,
        } = data;
        const { answers } = body;
        const poll =
            await this.getPollDocument(
                pollId
            );

        this.ensurePollCanReceiveVotes(
            poll
        );

        const pollVoteAccess =
            getVoteAccess(poll);

        if (
            pollVoteAccess ===
                voteAccessTypes.authenticated &&
            !userId
        ) {
            throw ApiError.unauthorized(
                "Please log in to vote on this poll"
            );
        }

        const normalizedAnswers =
            this.validateAnswers(
                poll,
                answers
            );
        const anonymousVoterHash =
            pollVoteAccess ===
            voteAccessTypes.anonymous
                ? hashAnonymousVoterToken(
                      anonymousVoterToken
                  )
                : null;

        if (userId) {
            const alreadyVoted =
                await Response.findOne({
                    poll: pollId,
                    respondent: userId,
                }).lean();

            if (alreadyVoted) {
                throw ApiError.conflict(
                    "You have already voted in this poll"
                );
            }
        } else if (
            anonymousVoterHash
        ) {
            const alreadyVoted =
                await Response.findOne({
                    poll: pollId,
                    anonymousVoterHash,
                }).lean();

            if (alreadyVoted) {
                throw ApiError.conflict(
                    "This device has already voted in this poll"
                );
            }
        }

        let response;

        try {
            response =
                await Response.create({
                    poll: pollId,
                    respondent:
                        pollVoteAccess ===
                        voteAccessTypes.authenticated
                            ? userId
                            : null,
                    anonymousVoterHash,
                    submissionType:
                        pollVoteAccess,
                    answers:
                        normalizedAnswers,
                });
        } catch (error) {
            if (
                error?.code === 11000
            ) {
                throw ApiError.conflict(
                    anonymousVoterHash
                        ? "This device has already voted in this poll"
                        : "You have already voted in this poll"
                );
            }

            throw error;
        }

        const results =
            await this.buildPollResults(
                poll,
                {
                    requesterId:
                        poll.creator,
                    bypassAccessCheck:
                        true,
                }
            );

        return {
            response,
            poll:
                serializePoll(poll, {
                    requesterId: userId,
                    responseCount:
                        results.totalVotes,
                }),
            results,
        };
    }

    static async getPollResults(
        pollId,
        requesterId = null
    ) {
        const poll =
            await this.getPollDocument(
                pollId
            );

        return this.buildPollResults(
            poll,
            {
                requesterId,
            }
        );
    }

    static async publishPollResults(
        {
            pollId,
            userId,
        }
    ) {
        if (!userId) {
            throw ApiError.unauthorized(
                "Unauthorized"
            );
        }

        const poll =
            await this.getPollDocument(
                pollId
            );

        if (
            String(poll.creator) !==
            String(userId)
        ) {
            throw ApiError.forbidden(
                "Only the poll creator can publish results"
            );
        }

        if (!poll.resultsPublished) {
            poll.resultsPublished = true;
            poll.isPublished = true;
            poll.isClosed = true;
            await poll.save();
        }

        const results =
            await this.buildPollResults(
                poll,
                {
                    requesterId: userId,
                    bypassAccessCheck:
                        true,
                }
            );

        return {
            poll:
                serializePoll(poll, {
                    requesterId: userId,
                    responseCount:
                        results.totalVotes,
                }),
            results,
        };
    }
}

export default PollService;