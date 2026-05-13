import { Response } from "../models/response.models.js";
import { ApiError } from "../utils/error.js";

export const voteAccessTypes = {
    anonymous: "anonymous",
    authenticated: "authenticated",
};

export const getVoteAccess = (
    poll
) =>
    poll?.voteAccess ||
    (poll?.isAnonymous
        ? voteAccessTypes.anonymous
        : voteAccessTypes.authenticated);

export const getQuestionRequiredFlag = (
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

export const isPollExpired = (
    poll
) =>
    Boolean(
        poll?.expiresAt &&
            new Date(poll.expiresAt) <
                new Date()
    );

export const isPollClosed = (
    poll
) =>
    Boolean(
        poll?.isClosed ||
            poll?.resultsPublished ||
            isPollExpired(poll)
    );

const serializeQuestions = (
    questions = []
) =>
    questions.map((question) => ({
        ...question,
        required:
            getQuestionRequiredFlag(
                question
            ),
        isRequired:
            getQuestionRequiredFlag(
                question
            ),
    }));

const getQuestionPrompt = (
    question,
    fallbackLabel
) =>
    question?.questionText ||
    question?.prompt ||
    question?.question ||
    question?.text ||
    fallbackLabel;

const compareOptions = (
    firstOption,
    secondOption
) => {
    if (
        firstOption.votes !==
        secondOption.votes
    ) {
        return (
            secondOption.votes -
            firstOption.votes
        );
    }

    return firstOption.label.localeCompare(
        secondOption.label
    );
};

const pickTopOption = (options) => {
    if (
        !Array.isArray(options) ||
        options.length === 0
    ) {
        return null;
    }

    return [...options].sort(compareOptions)[0];
};

const pickLeastOption = (options) => {
    if (
        !Array.isArray(options) ||
        options.length === 0
    ) {
        return null;
    }

    return [...options].sort(
        (firstOption, secondOption) => {
            if (
                firstOption.votes !==
                secondOption.votes
            ) {
                return (
                    firstOption.votes -
                    secondOption.votes
                );
            }

            return firstOption.label.localeCompare(
                secondOption.label
            );
        }
    )[0];
};

const formatTrendBucketLabel = (
    dateValue,
    interval
) =>
    interval === "hour"
        ? new Intl.DateTimeFormat(
              "en-US",
              {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
              }
          ).format(dateValue)
        : new Intl.DateTimeFormat(
              "en-US",
              {
                  month: "short",
                  day: "numeric",
              }
          ).format(dateValue);

const buildTrendSeries = (
    responses = [],
    pollCreatedAt
) => {
    const pollCreatedDate =
        pollCreatedAt
            ? new Date(pollCreatedAt)
            : null;
    const pollAgeMs =
        pollCreatedDate &&
        !Number.isNaN(
            pollCreatedDate.getTime()
        )
            ? Date.now() -
              pollCreatedDate.getTime()
            : 0;
    const interval =
        pollAgeMs > 48 * 60 * 60 * 1000
            ? "day"
            : "hour";
    const buckets = new Map();

    responses.forEach((response) => {
        const submittedAt = new Date(
            response.createdAt ||
                response.submittedAt ||
                Date.now()
        );

        if (
            Number.isNaN(
                submittedAt.getTime()
            )
        ) {
            return;
        }

        const bucketStart = new Date(
            submittedAt
        );

        if (interval === "hour") {
            bucketStart.setMinutes(
                0,
                0,
                0
            );
        } else {
            bucketStart.setHours(
                0,
                0,
                0,
                0
            );
        }

        const bucketKey =
            bucketStart.toISOString();
        const existingBucket =
            buckets.get(bucketKey) || 0;

        buckets.set(
            bucketKey,
            existingBucket + 1
        );
    });

    return {
        interval,
        buckets: [...buckets.entries()]
            .sort(
                ([firstBucket], [secondBucket]) =>
                    new Date(firstBucket) -
                    new Date(secondBucket)
            )
            .map(
                ([
                    bucketStart,
                    responsesCount,
                ]) => ({
                    bucketStart,
                    label:
                        formatTrendBucketLabel(
                            new Date(
                                bucketStart
                            ),
                            interval
                        ),
                    responses:
                        responsesCount,
                })
            ),
    };
};

const buildParticipationSummary = (
    responses,
    questionCount
) => {
    const totalResponses =
        responses.length;
    const anonymousResponses =
        responses.filter(
            (response) =>
                response.submissionType ===
                    voteAccessTypes.anonymous ||
                !response.respondent
        ).length;
    const authenticatedResponses =
        totalResponses -
        anonymousResponses;
    const totalAnswersProvided =
        responses.reduce(
            (total, response) =>
                total +
                (response.answers?.length ||
                    0),
            0
        );
    const totalPossibleAnswers =
        totalResponses * questionCount;
    const completionRate =
        totalPossibleAnswers > 0
            ? Math.round(
                  (totalAnswersProvided /
                      totalPossibleAnswers) *
                      100
              )
            : 0;

    return {
        anonymousResponses,
        authenticatedResponses,
        anonymousRatio:
            totalResponses > 0
                ? Math.round(
                      (anonymousResponses /
                          totalResponses) *
                          100
                  )
                : 0,
        authenticatedRatio:
            totalResponses > 0
                ? Math.round(
                      (authenticatedResponses /
                          totalResponses) *
                          100
                  )
                : 0,
        completionRate,
        averageAnswersPerResponse:
            totalResponses > 0
                ? Number(
                      (
                          totalAnswersProvided /
                          totalResponses
                      ).toFixed(1)
                  )
                : 0,
    };
};

export const serializePoll = (
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
    const closedState =
        isPollClosed({
            ...pollObject,
            resultsPublished,
            isExpired,
        });
    const status = resultsPublished
        ? "published"
        : isExpired
          ? "expired"
          : closedState
            ? "closed"
            : "active";

    return {
        ...pollObject,
        voteAccess,
        isAnonymous:
            voteAccess ===
            voteAccessTypes.anonymous,
        resultsPublished,
        isPublished:
            resultsPublished,
        isClosed: closedState,
        isExpired,
        status,
        responseCount,
        totalVotes: responseCount,
        canVote: !closedState,
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

export const buildResponseCountMap =
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

export const buildPollResultsPayload = ({
    poll,
    responses = [],
    requesterId = null,
    bypassAccessCheck = false,
    viewerCount = null,
}) => {
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
            (question, questionIndex) => {
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
                        response.answers?.forEach(
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
                const options =
                    Object.entries(
                        optionCounts
                    ).map(
                        ([
                            label,
                            votes,
                        ]) => ({
                            label,
                            votes:
                                Number(votes),
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
                    );
                const topOption =
                    pickTopOption(
                        options
                    );
                const leastOption =
                    pickLeastOption(
                        options
                    );

                return {
                    questionId:
                        question._id,
                    question:
                        getQuestionPrompt(
                            question,
                            `Question ${
                                questionIndex +
                                1
                            }`
                        ),
                    required:
                        getQuestionRequiredFlag(
                            question
                        ),
                    totalVotes:
                        questionTotalVotes,
                    participationRate:
                        totalVotes > 0
                            ? Math.round(
                                  (questionTotalVotes /
                                      totalVotes) *
                                      100
                              )
                            : 0,
                    results:
                        optionCounts,
                    topOption,
                    leastOption,
                    options,
                };
            }
        );
    const flattenedOptions =
        results.flatMap((question) =>
            question.options.map(
                (option) => ({
                    ...option,
                    questionId:
                        question.questionId,
                    question:
                        question.question,
                })
            )
        );
    const participation =
        buildParticipationSummary(
            responses,
            serializedPoll.questions
                .length
        );
    const responseTrend =
        buildTrendSeries(
            responses,
            serializedPoll.createdAt
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
        questionCount:
            serializedPoll.questions
                .length,
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
        isPublished:
            serializedPoll.isPublished,
        canViewResults:
            serializedPoll.canViewResults,
        canPublishResults:
            serializedPoll.canPublishResults,
        viewerCount,
        results,
        questionSummaries:
            results.map((question) => ({
                questionId:
                    question.questionId,
                question:
                    question.question,
                totalVotes:
                    question.totalVotes,
                participationRate:
                    question.participationRate,
                topOption:
                    question.topOption,
                leastOption:
                    question.leastOption,
            })),
        responseTrend,
        participation,
        mostSelectedOption:
            pickTopOption(
                flattenedOptions
            ),
        leastSelectedOption:
            pickLeastOption(
                flattenedOptions
            ),
    };
};