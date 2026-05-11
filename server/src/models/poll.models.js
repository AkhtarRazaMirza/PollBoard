import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true,
        trim: true,
    },

    options: {
        type: [
            {
                type: String,
                required: true,
                trim: true,
            },
        ],

        validate: {
            validator: function (options) {
                return options.length >= 2;
            },

            message: "Question must contain at least 2 options",
        },
    },

    required: {
        type: Boolean,
        default: true,
    },
});

const pollSchema = new mongoose.Schema(
    {
        pollTitle: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
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
                    return Array.isArray(questions) && questions.length > 0;
                },

                message: "Poll must contain at least one question",
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

export const Poll = mongoose.model("Poll", pollSchema);