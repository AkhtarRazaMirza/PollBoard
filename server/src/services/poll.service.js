import mongoose from "mongoose";

import { Response } from "../models/response.models.js";
import { Poll } from "../models/poll.models.js";
import { ApiError } from "../utils/error.js";

const voteAccessTypes = {
    anonymous: "anonymous",
    authenticated: "authenticated",
};

const getVoteAccess = (poll) =>
    poll?.voteAccess ||
    (poll?.isAnonymous
        ? voteAccessTypes.anonymous
        : voteAccessTypes.authenticated);

const getQuestionRequiredFlag = (
    question
) => {
    if (
        typeof question?.required ===
        "boolean"
    ) {
        return question.required;
    }

    if (
        typeof question?.isRequired ===
        "boolean"
    ) {
        return question.isRequired;
    }

    return true;
};

const isPollExpired = (poll) =>
    Boolean(
        poll?.expiresAt &&
            new Date(poll.expiresAt) <
                new Date()
    );

const isPollClosed = (poll) =>
    Boolean(
        poll?.isClosed ||
            poll?.resultsPublished ||
            isPollExpired(poll)
    );

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

const serializeQuestions = (
    questions = []
) =>
    questions.map(
        (question) => ({
            ...question,
            required:
                getQuestionRequiredFlag(
                    question
                ),
            isRequired:
                getQuestionRequiredFlag(
                    question
                ),
        })
    );

const serializePoll = (
    poll,
    {
        requesterId = null,
        responseCount = 0,
    } = {}
) => {
    const pollObject =
        typeof poll?.toObject ===
        "function"
            ? poll.toObject({
                  virtuals: true,
              })
            : { ...poll };

    const voteAccess =
        getVoteAccess(pollObject);
    const isExpired =
        isPollExpired(pollObject);
    const resultsPublished =
        Boolean(
            pollObject.resultsPublished ||
                pollObject.isPublished
        );
    const creatorId =
        pollObject?.creator?._id ||
        pollObject?.creator;
    const isOwner = Boolean(
        requesterId &&
            creatorId &&
            String(creatorId) ===
                String(requesterId)
    );

    return {
        ...pollObject,
        voteAccess,
        isAnonymous:
            voteAccess ===
            voteAccessTypes.anonymous,
        resultsPublished,
        isPublished:
            resultsPublished,
        isClosed:
            isPollClosed({
                ...pollObject,
                resultsPublished,
                isExpired,
            }),
        isExpired,
        responseCount,
        totalVotes: responseCount,
        canVote:
            !isPollClosed({
                ...pollObject,
                resultsPublished,
                isExpired,
            }),
        isOwner,
        canViewResults:
            resultsPublished || isOwner,
        canPublishResults:
            isOwner && !resultsPublished,
        questions:
            serializeQuestions(
                pollObject.questions
            ),
    };
};

const buildResponseCountMap =
    async (pollIds) => {
        if (
            !Array.isArray(pollIds) ||
            pollIds.length === 0
        ) {
            return new Map();
        }

        const aggregatedCounts =
            await Response.aggregate([
                {
                    $match: {
                        poll: {
                            $in: pollIds,
                        },
                    },
                },
                {
                    $group: {
                        _id: "$poll",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]);

        return new Map(
            aggregatedCounts.map(
                (item) => [
                    String(item._id),
                    item.count,
                ]
            )
        );
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
        } = {}
    ) {
        const responses =
            await Response.find({
                poll: poll._id,
            }).lean();

        const totalVotes =
            responses.length;
        const serializedPoll =
            serializePoll(poll, {
                requesterId,
                responseCount: totalVotes,
            });

        if (
            !bypassAccessCheck &&
            !serializedPoll.canViewResults
        ) {
            throw ApiError.forbidden(
                "Results are private until the creator publishes them"
            );
        }

        const results =
            serializedPoll.questions.map(
                (question) => {
                    const optionCounts =
                        {};

                    question.options.forEach(
                        (option) => {
                            optionCounts[
                                option
                            ] = 0;
                        }
                    );

                    responses.forEach(
                        (response) => {
                            response.answers.forEach(
                                (answer) => {
                                    if (
                                        String(
                                            answer.questionId
                                        ) ===
                                        String(
                                            question._id
                                        )
                                    ) {
                                        optionCounts[
                                            answer.selectedOption
                                        ] =
                                            (optionCounts[
                                                answer.selectedOption
                                            ] ||
                                                0) +
                                            1;
                                    }
                                }
                            );
                        }
                    );

                    const questionTotalVotes =
                        Object.values(
                            optionCounts
                        ).reduce(
                            (
                                total,
                                currentValue
                            ) =>
                                total +
                                Number(
                                    currentValue
                                ),
                            0
                        );

                    return {
                        questionId:
                            question._id,
                        question:
                            question.questionText,
                        required:
                            getQuestionRequiredFlag(
                                question
                            ),
                        totalVotes:
                            questionTotalVotes,
                        results:
                            optionCounts,
                        options:
                            Object.entries(
                                optionCounts
                            ).map(
                                ([
                                    label,
                                    votes,
                                ]) => ({
                                    label,
                                    votes,
                                    percentage:
                                        questionTotalVotes >
                                        0
                                            ? Math.round(
                                                  (Number(
                                                      votes
                                                  ) /
                                                      questionTotalVotes) *
                                                      100
                                              )
                                            : 0,
                                })
                            ),
                    };
                }
            );

        return {
            pollId:
                serializedPoll._id,
            pollTitle:
                serializedPoll.pollTitle,
            pollDescription:
                serializedPoll.pollDescription ||
                "",
            totalVotes,
            totalResponses:
                totalVotes,
            voteAccess:
                serializedPoll.voteAccess,
            isAnonymous:
                serializedPoll.isAnonymous,
            isClosed:
                serializedPoll.isClosed,
            isExpired:
                serializedPoll.isExpired,
            expiresAt:
                serializedPoll.expiresAt ||
                null,
            resultsPublished:
                serializedPoll.resultsPublished,
            canViewResults:
                serializedPoll.canViewResults,
            canPublishResults:
                serializedPoll.canPublishResults,
            results,
        };
    }

    // create poll
    static async createPoll(data) {
        const {
            pollTitle,
            pollDescription,
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

        if (!pollTitle?.trim()) {
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
                    pollTitle.trim(),
                pollDescription:
                    pollDescription?.trim() ||
                    "",
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

    // get user polls
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

    // get recent polls
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

    // get poll by id
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

    // vote poll
    static async votePoll(data) {
        const {
            pollId,
            userId,
            body,
        } = data;
        const { answers } = body;

        const poll =
            await this.getPollDocument(
                pollId
            );

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

        if (userId) {
            const alreadyVoted =
                await Response.findOne({
                    poll: pollId,
                    respondent: userId,
                });

            if (alreadyVoted) {
                throw ApiError.conflict(
                    "You have already voted in this poll"
                );
            }
        }

        const response =
            await Response.create({
                poll: pollId,
                respondent:
                    pollVoteAccess ===
                    voteAccessTypes.authenticated
                        ? userId
                        : null,
                answers:
                    normalizedAnswers,
            });

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

    // get poll results
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

    // publish results
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