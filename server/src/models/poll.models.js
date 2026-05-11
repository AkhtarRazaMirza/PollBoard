import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        questionText: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,

            validate: {
                validator: function (value) {
                    return value.trim().length > 0;
                },

                message: "Question text cannot be empty",
            },
        },

        options: {
            type: [
                {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 200,
                },
            ],

            validate: {
                validator: function (options) {
                    return (
                        Array.isArray(options) &&
                        options.length >= 2 &&
                        options.every(
                            (option) =>
                                typeof option === "string" &&
                                option.trim().length > 0
                        )
                    );
                },

                message:
                    "Question must contain at least 2 non-empty options",
            },
        },

        isRequired: {
            type: Boolean,
            default: true,
        },
    },
);

const pollSchema = new mongoose.Schema(
    {
        pollTitle: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,

            validate: {
                validator: function (value) {
                    return value.trim().length > 0;
                },

                message: "Poll title cannot be empty",
            },
        },

        pollDescription: {
            type: String,
            trim: true,
            maxlength: 1000,
        },

        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        questions: {
            type: [questionSchema],
            required: true,

            validate: {
                validator: function (questions) {
                    return (
                        Array.isArray(questions) &&
                        questions.length > 0
                    );
                },

                message:
                    "Poll must contain at least one question",
            },
        },

        isAnonymous: {
            type: Boolean,
            default: false,
        },

        isPublished: {
            type: Boolean,
            default: false,
        },

        expiresAt: {
            type: Date,

            validate: {
                validator: function (value) {
                    return !value || value > new Date();
                },

                message: "Expiry date must be in the future",
            },
        },

        timePerQuestion: {
            type: Number,
            min: 5,
            max: 300,
            default: 30,
        },
    },
    {
        timestamps: true,
    }
);

pollSchema.virtual("isExpired").get(function () {
    return this.expiresAt && this.expiresAt < new Date();
});

pollSchema.index({ expiresAt: 1 });

export const Poll = mongoose.model("Poll", pollSchema);