"use server";
import { signIn } from "@/auth";
import { getUserByEmail } from "@/data/user";
import { sendVerificationMail } from "@/lib/mail";
import { generateVerificationToken } from "@/lib/tokens";
import { DEFAULT_LOGIN_REDIRECT } from "@/route";
import { LoginSchema } from "@/schema";
import { AuthError } from "next-auth";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { getVerificationTokenByEmail } from "@/data/verification-token";
import { db } from "@repo/db/src";

export const login = async(values: z.infer<typeof LoginSchema>) => {
    const validation = LoginSchema.safeParse(values);
    if (!validation.success) {
        return {
            error: "Invalid input"
        }
    }
    const { email, password } = validation.data;
    console.log("Attempting login for email:", email);
    const existingUser = await getUserByEmail(email);
    console.log("Existing user:", existingUser);
    if (!existingUser || !existingUser.password) {
        return { error: "Email does not exist" };
    }

    const passVerify = bcrypt.compareSync(password, existingUser?.password);
    if (!passVerify) {
        return { error: "Wrong Password" };
    }

    if (!existingUser.emailVerified) {
        const verificationToken = await generateVerificationToken(email);
        if (!verificationToken) return;
        await sendVerificationMail(email, verificationToken.token);
        return { success: "Confirmation email Sent" };
    } else {
        const token = await getVerificationTokenByEmail(email);
        if (token) {
            const hasExpired = new Date(token.expires) < new Date();
            if (hasExpired) {
                if (token && token.id) {
                    await db.verificationToken.delete({
                        where: {
                            id: token.id
                        }
                    });
                }
                const verificationToken = await generateVerificationToken(email);
                if (!verificationToken) return;
                await sendVerificationMail(email, verificationToken.token);
                return { success: "Confirmation email Sent" };
            }
        }
    }
    
    try {
        await signIn("credentials", {
            email,  
            password,
            redirect: false,
        })
        return { success: "Logged In Successfully", redirect: DEFAULT_LOGIN_REDIRECT };
    } catch (error) {
        console.log(error);
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid Credentials" }
                default:
                    return { error: "Something Went Wrong" }
            }
        }
        throw error;
    }
}