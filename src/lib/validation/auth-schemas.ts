/**
 * Zod validation schemas for authentication forms.
 * These schemas are used for both client-side and server-side validation.
 */

import { z } from "zod";

/**
 * Email validation schema.
 * Ensures email is required and properly formatted.
 * Uses superRefine for proper error prioritization.
 */
export const emailSchema = z.string().superRefine((val, ctx) => {
  // Check if empty first
  if (!val || val.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Email jest wymagany",
    });
    return;
  }

  // Then check format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Wprowadź poprawny adres email",
    });
  }
});

/**
 * Password validation schema for login.
 * Only requires non-empty password.
 */
export const passwordSchema = z.string().min(1, "Hasło jest wymagane");

/**
 * Password validation schema for registration.
 * Requires minimum 8 characters.
 */
export const registerPasswordSchema = z
  .string()
  .min(1, "Hasło jest wymagane")
  .min(8, "Hasło musi mieć co najmniej 8 znaków");

/**
 * Login form validation schema.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Registration form validation schema with password confirmation.
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, "Potwierdź swoje hasło"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są zgodne",
    path: ["confirmPassword"],
  });

/**
 * Password recovery form validation schema.
 */
export const recoverPasswordSchema = z.object({
  email: emailSchema,
});

// Export types inferred from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type RecoverPasswordFormData = z.infer<typeof recoverPasswordSchema>;
