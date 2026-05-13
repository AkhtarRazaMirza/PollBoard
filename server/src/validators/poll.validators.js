import { z } from "zod";

const questionPromptSchema =
    z.string().trim().optional();

const optionInputSchema = z.union([
    z.string(),
    z
        .object({
            text: z
                .string()
                .optional(),
            label: z
                .string()
                .optional(),
            value: z
                .string()
                .optional(),
        })
        .passthrough(),
]);

const questionSchema = z
    .object({
        questionText:
            questionPromptSchema,
        prompt: questionPromptSchema,
        question:
            questionPromptSchema,
        text: questionPromptSchema,
        required: z
            .boolean()
            .optional(),
        isRequired: z
            .boolean()
            .optional(),
        options: z
            .array(optionInputSchema)
            .min(
                2,
                "Each question needs at least two options"
            ),
    })
    .passthrough()
    .superRefine((value, ctx) => {
        const prompt =
            value.questionText ||
            value.prompt ||
            value.question ||
            value.text ||
            "";

        if (!prompt.trim()) {
            ctx.addIssue({
                code: "custom",
                message:
                    "Each question needs text",
                path: ["questionText"],
            });
        }
    });

export const createPollSchema = z
    .object({
        pollTitle: z
            .string()
            .trim()
            .max(
                255,
                "Poll title is too long"
            )
            .optional(),
        title: z
            .string()
            .trim()
            .max(
                255,
                "Poll title is too long"
            )
            .optional(),
        pollDescription: z
            .string()
            .trim()
            .max(
                1000,
                "Poll description is too long"
            )
            .optional(),
        description: z
            .string()
            .trim()
            .max(
                1000,
                "Poll description is too long"
            )
            .optional(),
        voteAccess: z
            .enum([
                "anonymous",
                "authenticated",
            ])
            .optional(),
        isAnonymous: z
            .boolean()
            .optional(),
        expiresAt: z
            .coerce
            .date()
            .nullable()
            .optional(),
        timePerQuestion: z
            .coerce.number()
            .min(
                5,
                "Time per question must be at least 5 seconds"
            )
            .max(
                300,
                "Time per question cannot exceed 300 seconds"
            )
            .optional(),
        questions: z
            .array(questionSchema)
            .min(
                1,
                "Poll must contain at least one question"
            ),
    })
    .passthrough()
    .superRefine((value, ctx) => {
        const pollTitle =
            value.pollTitle ||
            value.title ||
            "";

        if (!pollTitle.trim()) {
            ctx.addIssue({
                code: "custom",
                message:
                    "Poll title is required",
                path: ["pollTitle"],
            });
        }
    });

const answerSchema = z
    .object({
        questionId: z
            .string()
            .trim()
            .min(
                1,
                "Question ID is required"
            ),
        selectedOption: z
            .string()
            .trim()
            .optional(),
        optionText: z
            .string()
            .trim()
            .optional(),
        answer: z
            .string()
            .trim()
            .optional(),
    })
    .passthrough()
    .superRefine((value, ctx) => {
        const selectedOption =
            value.selectedOption ||
            value.optionText ||
            value.answer ||
            "";

        if (!selectedOption.trim()) {
            ctx.addIssue({
                code: "custom",
                message:
                    "Each answer needs a selected option",
                path: ["selectedOption"],
            });
        }
    });

export const votePollSchema = z
    .object({
        answers: z
            .array(answerSchema)
            .min(
                1,
                "At least one answer is required"
            ),
    })
    .passthrough();

export const publishResultsSchema =
    z.object({}).passthrough();