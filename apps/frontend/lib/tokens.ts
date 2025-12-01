import { v4 as uuidv4 } from 'uuid';
import { db } from '@repo/db/src';
import { VerificationToken } from '@prisma/client';

export const generateVerificationToken = async (email: string): Promise<VerificationToken | null> => {
  const token = uuidv4();
  const expires = new Date(Date.now() + 3600 * 1000); // 1 hour from now

  // Delete existing token if any
  const existingToken = await db.verificationToken.findFirst({
    where: { email },
  });

  if (existingToken) {
    await db.verificationToken.delete({
      where: { id: existingToken.id },
    });
  }

  // Create new token
  const newToken = await db.verificationToken.create({
    data: {
      token,
      expires,
      email
    }
  });

  return newToken;
};