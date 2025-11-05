import * as z from 'zod';
import { User, Video } from "@prisma/client";

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
export const SignUpSchema = z.object({
    email: z.string().email(),
    otp: z.string().min(6, 'OTP must be 6 characters'),
    password1: z.string().min(6, 'Password must be 6 characters'),
    password2: z.string().min(6, 'Password must be 6 characters'),
    name: z.string().min(1),
});
export const SendMoneySchema = z.object({
    email: z.string().email(),
    amount: z.string()
      .min(1, "At least write some amount")
      .refine(value => parseFloat(value) > 0, {
        message: "Amount must be greater than 0",
      })
});

export type videoType = Omit<Video, "videoResolution"> & {
    user: User;
}