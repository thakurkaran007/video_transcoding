import type { Request, Response } from "express";
import { db } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { cookiesType } from "../types/index.js";
import { getSignedCookies, type CloudfrontSignedCookiesOutput } from "@aws-sdk/cloudfront-signer";

export const signIn = async (req: Request, res: Response) => {
  console.log('SignIn request body:', req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: "Password is incorrect." });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ message: "Email not verified. Please verify your email." });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
  });

  console.log("JWT cookie set successfully");

  await sendCookies(req, res);

  res.status(200).json({ message: "Signed in successfully.", token });
};


// AWS CloudFront Signed Cookies for protected content
function getSignedCookiesForBlob() {
  const cdnDistributionDomain = process.env.CDN_DISTRIBUTION_DOMAIN;
  const privateKey = process.env.CDN_PRIVATE_KEY!;
  const interval = 86400 * 1000; // 1 day
  
  const policy = {
    Statement: [
      {
        Resource: `https://${cdnDistributionDomain}/*`,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': Math.floor((Date.now() + interval) / 1000)
          }
        }
      }
    ]
  };

  const policyString = JSON.stringify(policy);
  const cookiesOptions = {
    domain: process.env.DOMAIN,
    secure: true,
    path: '/',
    sameSite: 'none'
  };

  const cookies = getSignedCookies({
    keyPairId: process.env.CDN_KEY_PAIR_ID!,
    privateKey,
    policy: policyString
  });

  const cookiesResult: cookiesType = {};
  (Object.keys(cookies) as (keyof CloudfrontSignedCookiesOutput)[]).forEach((key) => {
    const value = cookies[key];
    if (value != undefined) {
      cookiesResult[key] = {
        value,
        options: cookiesOptions
      };
    }
  });

  return cookiesResult;
}

export const sendCookies = async (req: Request, res: Response) => {
  console.log("Sending Cookies...");
  const cookies = getSignedCookiesForBlob();

    Object.entries(cookies).forEach(([key, curr]) => {
    if (!key || !curr || !curr.value) {
        console.log("⚠️ Skipping invalid cookie:", key);
        return;
    }

    if (typeof key !== "string" || key.trim() === "") {
        console.log("⚠️ Invalid cookie name:", key);
        return;
    }

    res.cookie(key, curr.value, curr.options);
    console.log("✅ Cookie sent:", key);
    });
};

export const protect = async (req: Request, res: Response, next: Function) => {
  let token = req.cookies?.jwt;
  console.log("Protect middleware - token from cookie:", req.cookies);

  if (!token && req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not logged in. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await db.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    (req as any).userId = decoded.userId;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid token. Please log in again." });
  }
};

export const signOut = (req: Request, res: Response) => {
  res.clearCookie("jwt");
  res.status(200).json({ message: "Signed out successfully." });
};

export async function getUser(req: Request, res: Response) {
  const userId = req.body.userId;
  try {
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    console.error("❌ Error in getUser:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}