import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const getPremium = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUserId) {
      res.status(401).json({ message: "User not authenticated!" });
      return;
    }

    const userData = await prisma.user.findFirst({
      where: {
        id: req.authUserId,
      },
      select: {
        isPremium: true,
      },
    });
    const isPremium = userData?.isPremium || false;

    res.status(200).json({
      isPremium: isPremium,
    });
  } catch (error) {
    console.error("Error fetching premium status:", error);
    res.status(500).json({
      message: "Failed to fetch premium status!",
      error: error,
    });
  }
};

export const setPremium = async (req: AuthenticatedRequest, res: Response) => {
  res.status(201).json({
    status: true,
  });
};
