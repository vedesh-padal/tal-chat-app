import { z } from "zod";
import { AvailableUserRoles } from "../../../constants";

// more strict password schema if requried:
/*
* const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');
*/


// User Registration schema
const userRegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Eamil is invalid"),
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters long")
    .refine((val) => val === val.toLowerCase(), {
      message: "Username must be lowercase"
    }),
  password: z.string().trim().min(1, "Password is required"),
  role: z.enum(AvailableUserRoles).optional()
});

// User Login schema
const userLoginSchema = z.object({
  email: z.string().email("Email is invalid").optional(),
  username: z.string().optional(),
  password: z.string().min(1, "Password is required")
});


// User change current password schema
const userChangeCurrentPasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(1, "New password is required")
})

// User forgot password schema
const userForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Email is invalid")
});

// User reset forgotten password schema
const userResetForgottenPasswordSchema = z.object({
  newPassword: z.string().min(1, "Password is required")
});

// User assign role schema
const userAssignRoleSchema = z.object({
  // role: z.enum(AvailableUserRoles).optional()
  role: z
    .string()
    .optional()
    .refine((value) => value === undefined || AvailableUserRoles.includes(value), "Invalid user role")
});

export {
  userRegisterSchema,
  userLoginSchema,
  userChangeCurrentPasswordSchema,
  userForgotPasswordSchema,
  userResetForgottenPasswordSchema,
  userAssignRoleSchema
};