import { z } from "zod";

const requiredTrimmedString = (
    fieldLabel,
    {
        minLength = 1,
        maxLength = 255,
    } = {}
) =>
    z
        .string({
            error: `${fieldLabel} is required`,
        })
        .trim()
        .min(
            minLength,
            `${fieldLabel} is required`
        )
        .max(
            maxLength,
            `${fieldLabel} is too long`
        );

export const signupSchema =
    z.object({
        firstName:
            requiredTrimmedString(
                "First name",
                {
                    maxLength: 55,
                }
            ),
        lastName:
            requiredTrimmedString(
                "Last name",
                {
                    maxLength: 50,
                }
            ),
        email: z
            .email(
                "Enter a valid email address"
            )
            .trim()
            .toLowerCase(),
        password: z
            .string({
                error: "Password is required",
            })
            .min(
                8,
                "Password must be at least 8 characters"
            )
            .max(
                66,
                "Password is too long"
            ),
    });

export const loginSchema = z.object({
    email: z
        .email(
            "Enter a valid email address"
        )
        .trim()
        .toLowerCase(),
    password:
        requiredTrimmedString(
            "Password",
            {
                maxLength: 200,
            }
        ),
});