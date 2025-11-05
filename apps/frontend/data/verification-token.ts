import { db } from "@repo/db/src";

export const getVerificationTokenByToken = async (token: string) => {
    try {
        const result = await db.verificationToken.findUnique({
            where: { token },
        });
        return result ?? null;
    } catch (error) {
        return null;
    }
};

export const getVerificationTokenByEmail = async (email: string) => {
    try {
        const result = await db.verificationToken.findFirst({
            where: { email }
        });
        return result ?? null;  
    } catch (error) {
        return null;
    }
};