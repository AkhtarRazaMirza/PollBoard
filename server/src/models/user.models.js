import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      maxlength: 55,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 322,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 66,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);