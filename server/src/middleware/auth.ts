import { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma";

dotenv.config();

export interface AuthenticatedRequest extends Request {
  authUserId?: string;
  isPremium?: boolean;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const clerkId = payload.sub;

    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      const userFromClerk = await clerkClient.users.getUser(clerkId);
      user = await prisma.user.create({
        data: {
          clerkId,
          email: userFromClerk.emailAddresses[0]?.emailAddress || "",
          name: userFromClerk.firstName || "",
        },
      });
    }

    req.authUserId = user.id;
    req.isPremium = user.isPremium;
    next();
  } catch (err) {
    console.error("Auth failed:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
