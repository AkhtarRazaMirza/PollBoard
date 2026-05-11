import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
    {
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        selectedOption: {
            type: String,
            required: true,
            trim: true,

            validate: {
                validator: function (value) {
                    return value.trim().length > 0;
                },

                message:
                    "Selected option cannot be empty",
            },
        },
    },
    {
        _id: false,
    }
);

const responseSchema = new mongoose.Schema(
    {
        poll: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Poll",
            required: true,
        },

        respondent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        answers: {
            type: [answerSchema],
            required: true,

            validate: {
                validator: function (answers) {
                    return (
                        Array.isArray(answers) &&
                        answers.length > 0
                    );
                },

                message:
                    "Response must contain at least one answer",
            },
        },

        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// prevent duplicate voting
responseSchema.index(
    { poll: 1, respondent: 1 },
    { unique: true }
);

export const Response = mongoose.model(
    "Response",
    responseSchema
);